/**
 * Normalize ticker text for dictionary lookups.
 */
export function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Normalize token names for dictionary lookups.
 */
export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
