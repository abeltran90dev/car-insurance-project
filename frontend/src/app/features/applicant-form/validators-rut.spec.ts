import { FormFieldConfig } from './form-field-config';
import { ValidationContext, compileField } from './validators';

const ctx: ValidationContext = { legalAge: 18, now: () => new Date(2026, 5, 15), genericError: 'GENERIC' };

const rutField: FormFieldConfig = {
  key: 'documentNumber',
  label: 'Doc',
  type: 'text',
  required: false,
  helpText: null,
  errorMessage: null,
  placeholder: null,
  order: 1,
  group: 'policyholder',
  maskInSummary: false,
  options: [],
  validations: [{ type: 'rut', value: null, message: null }],
};
const isValid = (raw: string): boolean => compileField(rutField, ctx)(raw) === null;

// Independent modulo-11 implementation, fictitious numbers only.
function dvOf(body: string): string {
  let sum = 0;
  let factor = 2;
  for (const digit of [...body].reverse()) {
    sum += Number(digit) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const r = 11 - (sum % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
}
const wrongDv = (dv: string): string => (dv === '5' ? '6' : '5');

describe('RUT body length (REVIEW-US-01-F06)', () => {
  it.each(['1', '12', '123', '1234', '12345', '123456789', '1234567890', '99999999999'])(
    'US-01-AC-09 body %s with correct check digit is valid, wrong digit invalid',
    (body) => {
      const dv = dvOf(body);
      expect(isValid(`${body}-${dv}`)).toBe(true);
      expect(isValid(`${body}${dv}`)).toBe(true);
      expect(isValid(`${body}-${wrongDv(dv)}`)).toBe(false);
    },
  );
});
