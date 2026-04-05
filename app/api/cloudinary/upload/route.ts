import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionContext } from '@/lib/rbac/session'

type CloudinaryUploadResponse = {
  secure_url?: string
  public_id?: string
  error?: {
    message?: string
  }
}

type CloudinaryRuntimeConfig = {
  cloudName: string
  apiKey: string
  apiSecret: string
}

function parseCloudinaryUrl(value: string): CloudinaryRuntimeConfig | null {
  // Format: cloudinary://<api_key>:<api_secret>@<cloud_name>
  if (!value.startsWith('cloudinary://')) return null
  try {
    const url = new URL(value)
    const cloudName = url.hostname
    const apiKey = decodeURIComponent(url.username || '')
    const apiSecret = decodeURIComponent(url.password || '')
    if (!cloudName || !apiKey || !apiSecret) return null
    return { cloudName, apiKey, apiSecret }
  } catch {
    return null
  }
}

function resolveCloudinaryConfig(): CloudinaryRuntimeConfig | null {
  const fromDiscrete = {
    cloudName:
      process.env.CLOUDINARY_CLOUD_NAME ??
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ??
      '',
    apiKey:
      process.env.CLOUDINARY_API_KEY ??
      process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ??
      '',
    apiSecret:
      process.env.CLOUDINARY_API_SECRET ??
      process.env.CLOUDINARY_SECRET ??
      '',
  }

  if (fromDiscrete.cloudName && fromDiscrete.apiKey && fromDiscrete.apiSecret) {
    return fromDiscrete
  }

  const fromUrl = process.env.CLOUDINARY_URL
    ? parseCloudinaryUrl(process.env.CLOUDINARY_URL)
    : null

  return fromUrl
}

function buildSignature(params: Record<string, string>, apiSecret: string): string {
  const sorted = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  return createHash('sha1')
    .update(`${sorted}${apiSecret}`)
    .digest('hex')
}

export async function POST(request: NextRequest) {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const config = resolveCloudinaryConfig()

  if (!config) {
    console.error(
      '[cloudinary-upload] Missing Cloudinary env. Expected CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET or CLOUDINARY_URL.'
    )
    return NextResponse.json(
      {
        error: 'Layanan upload gambar belum dikonfigurasi.',
      },
      { status: 500 }
    )
  }

  const form = await request.formData()
  const file = form.get('file')
  const folderRaw = form.get('folder')
  const folder =
    typeof folderRaw === 'string' && folderRaw.trim() !== ''
      ? folderRaw.trim()
      : 'marketplace'

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file wajib diisi' }, { status: 400 })
  }

  const timestamp = String(Math.floor(Date.now() / 1000))
  const signature = buildSignature({ folder, timestamp }, config.apiSecret)

  const cloudinaryForm = new FormData()
  cloudinaryForm.append('file', file)
  cloudinaryForm.append('folder', folder)
  cloudinaryForm.append('timestamp', timestamp)
  cloudinaryForm.append('api_key', config.apiKey)
  cloudinaryForm.append('signature', signature)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    {
      method: 'POST',
      body: cloudinaryForm,
    }
  )

  const data = (await response.json().catch(() => ({}))) as CloudinaryUploadResponse

  if (!response.ok) {
    console.error('[cloudinary-upload] Cloudinary upload failed', {
      status: response.status,
      message: data.error?.message ?? 'unknown',
    })
    return NextResponse.json(
      { error: data.error?.message ?? 'Gagal upload ke Cloudinary' },
      { status: 400 }
    )
  }

  if (!data.secure_url) {
    return NextResponse.json({ error: 'Upload berhasil tapi URL tidak tersedia' }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    secure_url: data.secure_url,
    public_id: data.public_id ?? null,
  })
}
