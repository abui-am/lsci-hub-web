import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function formatCurrencyIDR(
  value: number | null | undefined,
  fallback = 'Tidak tersedia'
) {
  if (value == null || !Number.isFinite(value)) return fallback
  return idrFormatter.format(value)
}

export function formatCurrencyRangeIDR(
  min: number | null | undefined,
  max: number | null | undefined,
  fallback = 'Tidak tersedia'
) {
  if (min == null && max == null) return fallback
  const minLabel = min == null ? '...' : formatCurrencyIDR(min)
  const maxLabel = max == null ? '...' : formatCurrencyIDR(max)
  return `${minLabel} - ${maxLabel}`
}

export function formatCreditScore(
  score: number | null | undefined,
  fallback = 95
) {
  const value = score == null || !Number.isFinite(score) ? fallback : score
  return `${value}/100`
}
