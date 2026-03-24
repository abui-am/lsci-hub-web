/** PostgREST may return an embedded row as object or single-element array. */
export function relationOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}
