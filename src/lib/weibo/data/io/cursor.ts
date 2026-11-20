export function normalizeCursor(value: number | string | null | undefined): string | null {
  if (value === undefined || value === null || value === '' || String(value) === '0') {
    return null
  }

  return String(value)
}
