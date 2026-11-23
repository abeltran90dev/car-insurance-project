export interface CopyEntryRaw {
  key: string;
  value: string;
}

export interface CountryRaw {
  documentId?: string;
  code: string;
  name: string;
  numberLocale: string;
  currency: string;
  legalAge: number;
  termsTitle?: string | null;
  termsBody?: string | null;
  copy?: CopyEntryRaw[] | null;
}

export interface CountryConfig {
  code: string;
  name: string;
  numberLocale: string;
  currency: string;
  legalAge: number;
  termsTitle: string;
  termsBody: string;
  copy: Record<string, string>;
}

export function toCopyRecord(entries: CopyEntryRaw[] | null | undefined): Record<string, string> {
  const record: Record<string, string> = {};
  for (const entry of entries ?? []) {
    if (typeof entry?.key === 'string' && typeof entry?.value === 'string') {
      record[entry.key] = entry.value;
    }
  }
  return record;
}

/** The only place that knows the raw Strapi country shape. */
export function toCountryConfig(raw: CountryRaw): CountryConfig {
  return {
    code: raw.code,
    name: raw.name,
    numberLocale: raw.numberLocale,
    currency: raw.currency,
    legalAge: raw.legalAge,
    termsTitle: raw.termsTitle ?? '',
    termsBody: raw.termsBody ?? '',
    copy: toCopyRecord(raw.copy),
  };
}

/**
 * Pure copy lookup (ADR-001). A missing key logs a warning and returns `fallback`
 * when given, otherwise the key itself (a visible defect).
 */
export function copy(source: { copy: Record<string, string> } | null | undefined, key: string, fallback?: string): string {
  const value = source?.copy[key];
  if (value !== undefined) {
    return value;
  }
  console.warn(`Missing copy key: ${key}`);
  return fallback ?? key;
}
