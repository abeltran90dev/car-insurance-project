/**
 * Simulated rating (SPEC-US-02 GAP-07, GAP-11, GAP-13): the age factors are one documented constant,
 * identical for every country. Not country content; moving them to Strapi is a later option.
 * Vehicle age bands: 0-5 years -> 1.00, 6-10 -> 1.15, 11-20 -> 1.30.
 */
const AGE_FACTORS: ReadonlyArray<{ maxAge: number; factor: number }> = [
  { maxAge: 5, factor: 1.0 },
  { maxAge: 10, factor: 1.15 },
  { maxAge: 20, factor: 1.3 },
];

/** Ages above the last band (blocked by step 1 validation) use the highest factor. */
const FALLBACK_FACTOR = 1.3;

/** Pure and reused by US-03. A missing year gives factor 1.00 and a console warning (GAP-12). */
export function computeFinalPrice(basePrice: number, vehicleYear: number | null, today: Date): number {
  return Math.round(basePrice * ageFactor(vehicleYear, today));
}

export function ageFactor(vehicleYear: number | null, today: Date): number {
  if (typeof vehicleYear !== 'number' || !Number.isInteger(vehicleYear)) {
    console.warn('Vehicle year unavailable; using age factor 1.00.');
    return 1;
  }
  const age = Math.max(0, today.getFullYear() - vehicleYear);
  return AGE_FACTORS.find((band) => age <= band.maxAge)?.factor ?? FALLBACK_FACTOR;
}
