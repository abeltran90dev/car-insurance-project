import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { FormFieldConfig, ValidationRule } from './form-field-config';

export type FieldValue = string | number | boolean | null;

export interface ValidationContext {
  /** Country legal age; null when not configured. */
  legalAge: number | null;
  /** Injectable "today" (browser local date). */
  now: () => Date;
  /** Country generic error message (`form.genericError`), last step of the message chain. */
  genericError: string;
}

export interface ValidationFailure {
  rule: string;
  message: string;
}

/** Error key under which the Angular validator reports a failure. */
export const RULE_ERROR = 'rule';

/** Normalizes a raw control/storage value by field type (SPEC-US-01 GAP-21). */
export function normalizeValue(field: FormFieldConfig, raw: unknown): FieldValue {
  switch (field.type) {
    case 'number': {
      if (raw === null || raw === undefined || raw === '') {
        return null;
      }
      const n = typeof raw === 'number' ? raw : Number(raw);
      return Number.isFinite(n) ? n : null;
    }
    case 'checkbox':
      return raw === true;
    case 'date':
    case 'select':
    case 'text':
      return raw === null || raw === undefined ? '' : String(raw).trim();
  }
}

function isEmpty(field: FormFieldConfig, value: FieldValue): boolean {
  return field.type === 'checkbox' ? value !== true : value === null || value === '';
}

const RUT_PATTERN = /^(\d{6,8})-?([\dK])$/;

/** Canonical RUT `body-DV` (no dots, uppercase K), or null when malformed or the check digit is wrong. */
export function normalizeRut(input: string): string | null {
  const match = RUT_PATTERN.exec(input.replace(/[.\s]/g, '').toUpperCase());
  if (!match) {
    return null;
  }
  const [, body, dv] = match;
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return expected === dv ? `${body}-${dv}` : null;
}

export function isValidColombianId(input: string): boolean {
  return /^\d{6,10}$/.test(input.trim());
}

/** Age in completed years at `today`. A Feb 29 birthday completes the year on Mar 1 in non-leap years. */
export function ageInYears(isoDate: string, today: Date): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    return null;
  }
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(y, m - 1, d);
  if (check.getFullYear() !== y || check.getMonth() !== m - 1 || check.getDate() !== d) {
    return null;
  }
  let age = today.getFullYear() - y;
  const month = today.getMonth() + 1;
  if (month < m || (month === m && today.getDate() < d)) {
    age--;
  }
  return age;
}

export function isValidVehicleYear(year: number, today: Date): boolean {
  const current = today.getFullYear();
  return Number.isInteger(year) && year >= current - 20 && year <= current + 1;
}

type Check = (value: FieldValue) => boolean;

/** Builds the check for one rule on a non-empty value, or null when the rule is ignored (with a warning). */
function compileRule(field: FormFieldConfig, rule: ValidationRule, ctx: ValidationContext): Check | null {
  const str = (v: FieldValue): string => (typeof v === 'string' ? v : v === null ? '' : String(v));
  const num = rule.value;
  switch (rule.type) {
    case 'minLength':
      return typeof num === 'number' ? (v) => str(v).length >= num : null;
    case 'maxLength':
      return typeof num === 'number' ? (v) => str(v).length <= num : null;
    case 'min':
      return typeof num === 'number' ? (v) => typeof v === 'number' && v >= num : null;
    case 'max':
      return typeof num === 'number' ? (v) => typeof v === 'number' && v <= num : null;
    case 'pattern': {
      if (typeof num !== 'string') {
        return null;
      }
      try {
        const regex = new RegExp(`^(?:${num})$`);
        return (v) => regex.test(str(v));
      } catch {
        console.warn(`Validator ignored (invalid pattern): field "${field.key}", validator "pattern"`);
        return null;
      }
    }
    case 'minAge': {
      const minimum = typeof num === 'number' ? num : ctx.legalAge;
      if (minimum === null || minimum === undefined) {
        console.warn(`Validator fails closed (no age value and no legal age): field "${field.key}", validator "minAge"`);
        return () => false;
      }
      return (v) => {
        const age = ageInYears(str(v), ctx.now());
        return age !== null && age >= minimum;
      };
    }
    case 'vehicleYear':
      return (v) => typeof v === 'number' && isValidVehicleYear(v, ctx.now());
    case 'rut':
      return (v) => normalizeRut(str(v)) !== null;
    case 'colombianId':
      return (v) => isValidColombianId(str(v));
    default:
      return null;
  }
}

/**
 * Compiles a field's validation into one pure function over a raw value. Message chain:
 * rule message -> field errorMessage -> country generic message (GAP-06).
 */
export function compileField(
  field: FormFieldConfig,
  ctx: ValidationContext,
): (raw: unknown) => ValidationFailure | null {
  const fallback = field.errorMessage ?? ctx.genericError;
  const requiredRule = field.validations.find((r) => r.type === 'required');
  const requiredMessage = requiredRule?.message ?? fallback;
  const mustHaveValue = field.required || requiredRule !== undefined;
  const checks: Array<{ type: string; message: string; check: Check }> = [];
  for (const rule of field.validations) {
    if (rule.type === 'required') {
      continue;
    }
    const check = compileRule(field, rule, ctx);
    if (check) {
      checks.push({ type: rule.type, message: rule.message ?? fallback, check });
    }
  }
  return (raw) => {
    const value = normalizeValue(field, raw);
    if (isEmpty(field, value)) {
      return mustHaveValue ? { rule: 'required', message: requiredMessage } : null;
    }
    for (const { type, message, check } of checks) {
      if (!check(value)) {
        return { rule: type, message };
      }
    }
    return null;
  };
}

/** Angular validators for one field (SPEC-US-01 section 5); the error carries the resolved message. */
export function buildValidators(field: FormFieldConfig, ctx: ValidationContext): ValidatorFn[] {
  const validate = compileField(field, ctx);
  return [
    (control: AbstractControl): ValidationErrors | null => {
      const failure = validate(control.value);
      return failure ? { [RULE_ERROR]: failure } : null;
    },
  ];
}

/** Value to persist for a field: normalized, RUT in canonical form. */
export function toStoredValue(field: FormFieldConfig, raw: unknown): FieldValue {
  const value = normalizeValue(field, raw);
  if (typeof value === 'string' && value !== '' && field.validations.some((r) => r.type === 'rut')) {
    return normalizeRut(value) ?? value;
  }
  return value;
}

/**
 * "Step 1 valid" (GAP-17): stored values checked against the currently published fields with the
 * same engine as the form. Shared by the guards of US-02 and US-03.
 */
export function isStep1Valid(
  fields: readonly FormFieldConfig[],
  values: Readonly<Record<string, FieldValue>>,
  ctx: ValidationContext,
): boolean {
  return fields.length > 0 && fields.every((f) => compileField(f, ctx)(values[f.key] ?? null) === null);
}
