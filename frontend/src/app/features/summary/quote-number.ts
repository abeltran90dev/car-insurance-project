const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** SPEC-US-03 GAP-21: `COT-{CC}-{YYYYMMDD}-{6 chars [A-Z0-9]}`; local date, crypto randomness. */
export function generateQuoteNumber(countryCode: string, now: Date): string {
  const yyyy = String(now.getFullYear()).padStart(4, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
  return `COT-${countryCode.toUpperCase()}-${yyyy}${mm}${dd}-${suffix}`;
}
