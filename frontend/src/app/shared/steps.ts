/** Technical route identifiers fixed by the approved specs (ADR-002), not editable copy. */
export const STEPS = ['datos', 'planes', 'resumen', 'confirmacion'] as const;
export type Step = (typeof STEPS)[number];

export function isStep(value: string | undefined): value is Step {
  return (STEPS as readonly string[]).includes(value ?? '');
}
