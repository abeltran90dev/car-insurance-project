/**
 * SPEC-US-03 section 5: normalize (drop spaces, dots, hyphens; upper-case), then keep only the
 * last 4 characters visible. Values of 4 characters or fewer are fully masked.
 */
export function maskDocument(value: string): string {
  const normalized = value.replace(/[\s.\-]/g, '').toUpperCase();
  const n = normalized.length;
  return n > 4 ? '*'.repeat(n - 4) + normalized.slice(-4) : '*'.repeat(n);
}
