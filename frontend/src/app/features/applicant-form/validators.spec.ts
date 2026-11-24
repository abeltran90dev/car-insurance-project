import { FormFieldConfig, ValidationRule } from './form-field-config';
import { ValidationContext, compileField, isStep1Valid } from './validators';

// Fixed clock: 2026-06-15 (local date).
const TODAY = new Date(2026, 5, 15);
const ctx = (over: Partial<ValidationContext> = {}): ValidationContext => ({
  legalAge: 18,
  now: () => TODAY,
  genericError: 'GENERIC',
  ...over,
});

function field(over: Partial<FormFieldConfig>): FormFieldConfig {
  return {
    key: 'f',
    label: 'F',
    type: 'text',
    required: false,
    helpText: null,
    errorMessage: null,
    placeholder: null,
    order: 1,
    group: 'policyholder',
    maskInSummary: false,
    options: [],
    validations: [],
    ...over,
  };
}
const rule = (type: string, value: number | string | null = null, message: string | null = null): ValidationRule => ({
  type,
  value,
  message,
});
const isValid = (f: FormFieldConfig, raw: unknown, c = ctx()): boolean => compileField(f, c)(raw) === null;

describe('validators', () => {
  it('US-01-AC-02 shows configured error message and blocks continue', () => {
    const f = field({
      required: true,
      errorMessage: 'FIELD-MSG',
      validations: [rule('minLength', 3, 'RULE-MSG')],
    });
    const validate = compileField(f, ctx());
    expect(validate('ab')).toEqual({ rule: 'minLength', message: 'RULE-MSG' });
    expect(validate('')).toEqual({ rule: 'required', message: 'FIELD-MSG' });
    expect(validate('abc')).toBeNull();
  });

  it('US-01-AC-02 required rule message overrides the field message for empty values', () => {
    const f = field({ errorMessage: 'FIELD-MSG', validations: [rule('required', null, 'REQ-MSG')] });
    expect(compileField(f, ctx())('  ')).toEqual({ rule: 'required', message: 'REQ-MSG' });
  });

  it('US-01-AC-02 checkbox must be checked when required', () => {
    const f = field({ type: 'checkbox', required: true, errorMessage: 'CHK' });
    expect(compileField(f, ctx())(false)?.message).toBe('CHK');
    expect(isValid(f, true)).toBe(true);
  });

  it('US-01-AC-02 min, max, minLength, maxLength and pattern boundaries', () => {
    expect(isValid(field({ type: 'number', validations: [rule('min', 0), rule('max', 500000)] }), 0)).toBe(true);
    expect(isValid(field({ type: 'number', validations: [rule('min', 0)] }), -1)).toBe(false);
    expect(isValid(field({ type: 'number', validations: [rule('max', 500000)] }), 500001)).toBe(false);
    expect(isValid(field({ validations: [rule('maxLength', 3)] }), ' abc ')).toBe(true);
    expect(isValid(field({ validations: [rule('maxLength', 3)] }), 'abcd')).toBe(false);
    const pat = field({ validations: [rule('pattern', '[A-Za-z]{3}\\d{3}')] });
    expect(isValid(pat, 'ABC123')).toBe(true);
    expect(isValid(pat, 'ABC1234')).toBe(false);
    expect(isValid(pat, 'xABC123')).toBe(false);
  });

  it('US-01-AC-02 optional empty field is valid and skips other rules', () => {
    expect(isValid(field({ validations: [rule('minLength', 5)] }), '')).toBe(true);
  });

  describe('US-01-AC-07 validates legal age at todays date', () => {
    const f = field({ type: 'date', validations: [rule('minAge')] });
    it('US-01-AC-07 17 (turns 18 tomorrow) is invalid', () => {
      expect(isValid(f, '2008-06-16')).toBe(false);
    });
    it('US-01-AC-07 18 (turns 18 today) is valid', () => {
      expect(isValid(f, '2008-06-15')).toBe(true);
    });
    it('US-01-AC-07 explicit parameter overrides legalAge', () => {
      expect(isValid(field({ type: 'date', validations: [rule('minAge', 21)] }), '2008-06-15')).toBe(false);
    });
    it('US-01-AC-07 Feb 29 birthday completes the year on Mar 1 in non-leap years', () => {
      expect(isValid(f, '2008-02-29', ctx({ now: () => new Date(2026, 2, 1) }))).toBe(true);
      expect(isValid(f, '2008-02-29', ctx({ now: () => new Date(2026, 1, 28) }))).toBe(false);
    });
    it('US-01-AC-07 impossible date is invalid', () => {
      expect(isValid(f, '2008-02-31')).toBe(false);
    });
    it('US-01-AC-24 minAge fails closed without parameter and without legalAge, and warns', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      expect(isValid(f, '1990-01-01', ctx({ legalAge: null }))).toBe(false);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('US-01-AC-08 validates vehicle year limits', () => {
    const f = field({ type: 'number', validations: [rule('vehicleYear')] });
    const year = TODAY.getFullYear();
    it.each([
      [year + 2, false],
      [year + 1, true],
      [year - 20, true],
      [year - 21, false],
    ])('US-01-AC-08 year %i -> %s', (y, expected) => {
      expect(isValid(f, y)).toBe(expected);
    });
    it('US-01-AC-08 non-integer year is invalid', () => {
      expect(isValid(f, year + 0.5)).toBe(false);
    });
    it('US-01-AC-08 limits follow the clock, not constants', () => {
      const later = ctx({ now: () => new Date(2030, 0, 1) });
      expect(isValid(f, 2031, later)).toBe(true);
      expect(isValid(f, 2009, later)).toBe(false);
    });
  });

  describe('US-01-AC-09 validates Chilean RUT', () => {
    const f = field({ validations: [rule('rut')] });
    it.each([
      ['11.111.111-1', true],
      ['11111111-1', true],
      ['111111111', true],
      ['11.111.111-2', false],
      ['11.111.111', false],
      ['abc', false],
    ])('US-01-AC-09 "%s" -> %s', (rut, expected) => {
      expect(isValid(f, rut)).toBe(expected);
    });
    it('US-01-AC-09 accepts check digit K case-insensitively', () => {
      // Search fictitious bodies whose modulo-11 digit is K; assert lower and upper case agree.
      let found = 0;
      for (let n = 10000000; n < 10000200; n++) {
        if (isValid(f, `${n}-K`)) {
          found++;
          expect(isValid(f, `${n}-k`)).toBe(true);
        }
      }
      expect(found).toBeGreaterThan(0);
    });
  });

  describe('US-01-AC-10 validates Colombian document number', () => {
    const f = field({ validations: [rule('colombianId')] });
    it.each([
      ['1111111111', true],
      ['111111', true],
      ['11111', false],
      ['11111111111', false],
      ['11111A1111', false],
    ])('US-01-AC-10 "%s" -> %s', (n, expected) => {
      expect(isValid(f, n)).toBe(expected);
    });
  });

  it('US-01-AC-16 ignores unknown validator with a warning (engine level)', () => {
    const f = field({ validations: [rule('doesNotExist', 'secret-value')] });
    expect(isValid(f, 'anything')).toBe(true);
  });

  describe('US-01-AC-19 falls back to country generic error message', () => {
    it('US-01-AC-19 no rule message and no errorMessage -> generic', () => {
      const f = field({ validations: [rule('minLength', 5)] });
      expect(compileField(f, ctx())('abc')).toEqual({ rule: 'minLength', message: 'GENERIC' });
    });
    it('US-01-AC-19 required failure with no messages -> generic', () => {
      expect(compileField(field({ required: true }), ctx())('')?.message).toBe('GENERIC');
    });
    it('US-01-AC-19 errorMessage beats generic', () => {
      const f = field({ errorMessage: 'MINE', validations: [rule('minLength', 5)] });
      expect(compileField(f, ctx())('abc')?.message).toBe('MINE');
    });
  });

  it('US-01-extra isStep1Valid checks stored values against current fields', () => {
    const fields = [field({ key: 'a', required: true }), field({ key: 'b' })];
    expect(isStep1Valid(fields, { a: 'x' }, ctx())).toBe(true);
    expect(isStep1Valid(fields, {}, ctx())).toBe(false);
    expect(isStep1Valid([], {}, ctx())).toBe(false);
  });
});
