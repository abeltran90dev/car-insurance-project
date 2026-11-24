/** Domain model and mapper for Strapi `form-field` entries (SPEC-US-01 section 4). */
export type FieldType = 'text' | 'number' | 'select' | 'date' | 'checkbox';
export type FieldGroup = 'policyholder' | 'vehicle';

export interface FieldOption {
  value: string;
  label: string;
  order: number;
}

export interface ValidationRule {
  type: string;
  value: number | string | null;
  message: string | null;
}

export interface FormFieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  helpText: string | null;
  errorMessage: string | null;
  placeholder: string | null;
  order: number;
  group: FieldGroup;
  maskInSummary: boolean;
  options: FieldOption[];
  validations: ValidationRule[];
}

export interface FormFieldRaw {
  documentId?: string;
  key: string;
  label: string;
  type: string;
  required?: boolean | null;
  helpText?: string | null;
  errorMessage?: string | null;
  placeholder?: string | null;
  order?: number | null;
  group?: string | null;
  maskInSummary?: boolean | null;
  options?: Array<{ value: string; label: string; order?: number | null }> | null;
  validations?: Array<{ type: string; value?: string | null; message?: string | null }> | null;
}

const FIELD_TYPES: readonly string[] = ['text', 'number', 'select', 'date', 'checkbox'];
const NUMERIC_RULES: readonly string[] = ['minLength', 'maxLength', 'min', 'max', 'minAge'];
/** Validator names implemented in code (SPEC-US-01 section 5). */
export const KNOWN_VALIDATORS: readonly string[] = [
  'required',
  'minLength',
  'maxLength',
  'min',
  'max',
  'pattern',
  'minAge',
  'vehicleYear',
  'rut',
  'colombianId',
];

function blankToNull(value: string | null | undefined): string | null {
  return value === undefined || value === null || value === '' ? null : value;
}

function toRules(key: string, raw: FormFieldRaw['validations']): ValidationRule[] {
  const rules: ValidationRule[] = [];
  for (const rule of raw ?? []) {
    if (!KNOWN_VALIDATORS.includes(rule.type)) {
      console.warn(`Unknown validator ignored: field "${key}", validator "${rule.type}"`);
      continue;
    }
    const message = blankToNull(rule.message);
    const text = blankToNull(rule.value);
    if (NUMERIC_RULES.includes(rule.type)) {
      if (text === null) {
        rules.push({ type: rule.type, value: null, message });
        continue;
      }
      const parsed = Number(text);
      if (!Number.isFinite(parsed)) {
        console.warn(`Validator ignored (parameter is not a number): field "${key}", validator "${rule.type}"`);
        continue;
      }
      rules.push({ type: rule.type, value: parsed, message });
      continue;
    }
    rules.push({ type: rule.type, value: text, message });
  }
  return rules;
}

/** Maps one raw entry. Returns null (with a warning) when the field must not be rendered. */
function toField(raw: FormFieldRaw): FormFieldConfig | null {
  if (!FIELD_TYPES.includes(raw.type)) {
    console.warn(`Field skipped (unknown type): field "${raw.key}"`);
    return null;
  }
  const options = (raw.options ?? [])
    .map((o) => ({ value: String(o.value), label: o.label, order: o.order ?? Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => a.order - b.order);
  if (raw.type === 'select' && options.length === 0) {
    console.warn(`Field skipped (select without options): field "${raw.key}"`);
    return null;
  }
  return {
    key: raw.key,
    label: raw.label,
    type: raw.type as FieldType,
    required: raw.required === true,
    helpText: blankToNull(raw.helpText),
    errorMessage: blankToNull(raw.errorMessage),
    placeholder: blankToNull(raw.placeholder),
    order: raw.order ?? 0,
    group: raw.group === 'vehicle' ? 'vehicle' : 'policyholder',
    maskInSummary: raw.maskInSummary === true,
    options,
    validations: toRules(raw.key, raw.validations),
  };
}

/** The only place that knows the raw Strapi form-field shape. Sorted by `order`, ties by `key`. */
export function toFormFieldConfigs(raws: readonly FormFieldRaw[]): FormFieldConfig[] {
  const sorted = [...raws].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.key.localeCompare(b.key));
  const seen = new Set<string>();
  const result: FormFieldConfig[] = [];
  for (const raw of sorted) {
    if (seen.has(raw.key)) {
      console.warn(`Field skipped (duplicate key): field "${raw.key}"`);
      continue;
    }
    seen.add(raw.key);
    const field = toField(raw);
    if (field) {
      result.push(field);
    }
  }
  return result;
}
