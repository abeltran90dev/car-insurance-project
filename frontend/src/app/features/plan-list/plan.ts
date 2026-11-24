/** Domain model and mapper for Strapi `plan` entries (SPEC-US-02 section 4.2). */
export interface PlanItem {
  title: string;
  description: string | null;
}

export interface Plan {
  documentId: string;
  name: string;
  shortDescription: string | null;
  basePrice: number;
  currency: string;
  order: number;
  recommended: boolean;
  coverages: PlanItem[];
  benefits: PlanItem[];
}

export interface PlanRaw {
  documentId: string;
  name: string;
  shortDescription?: string | null;
  basePrice?: number | string | null;
  currency?: string | null;
  order?: number | null;
  recommended?: boolean | null;
  coverages?: Array<{ title: string; description?: string | null }> | null;
  benefits?: Array<{ title: string; description?: string | null }> | null;
}

function toItems(raw: PlanRaw['coverages']): PlanItem[] {
  return (raw ?? []).map((i) => ({ title: i.title, description: i.description ?? null }));
}

/**
 * Maps and filters (GAP-14, GAP-15): plans whose currency differs from the country's, or whose
 * base price is not a finite number > 0, are dropped with a console warning. Order is kept.
 */
export function toPlans(raws: readonly PlanRaw[], countryCurrency: string): Plan[] {
  const plans: Plan[] = [];
  for (const raw of raws) {
    if (raw.currency !== countryCurrency) {
      console.warn(`Plan hidden (currency ${raw.currency} differs from ${countryCurrency}): "${raw.name}"`);
      continue;
    }
    const basePrice = raw.basePrice === null || raw.basePrice === undefined ? NaN : Number(raw.basePrice);
    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      console.warn(`Plan hidden (invalid base price): "${raw.name}"`);
      continue;
    }
    plans.push({
      documentId: raw.documentId,
      name: raw.name,
      shortDescription: raw.shortDescription ?? null,
      basePrice,
      currency: raw.currency,
      order: raw.order ?? 0,
      recommended: raw.recommended === true,
      coverages: toItems(raw.coverages),
      benefits: toItems(raw.benefits),
    });
  }
  return plans;
}
