/**
 * Seeds the admin user. Run once after setting SUPABASE_SERVICE_ROLE_KEY in .env
 *
 * Usage: pnpm run seed:admin
 *
 * Creates: email admin@localhost, password admin (Supabase Auth uses email, not username)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  const missing = []
  if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  console.error('Missing in .env:', missing.join(', '))
  console.error('Get the service role key from: Supabase Dashboard → Project → Settings → API → service_role (secret)')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ADMIN_EMAIL = 'admin@localhost'
const ADMIN_PASSWORD = 'admin'

async function seedAdmin() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  })

  if (error) {
    if (error.message.includes('already been registered')) {
      console.log('Admin user already exists:', ADMIN_EMAIL)
      return
    }
    console.error('Seed failed:', error.message)
    process.exit(1)
  }

  console.log('Admin user created:', data.user?.email)
}

seedAdmin()
