import { FormFieldRaw, toFormFieldConfigs } from './form-field-config';

const raw = (over: Partial<FormFieldRaw> & { key: string }): FormFieldRaw => ({
  label: over.key,
  type: 'text',
  required: false,
  order: 1,
  group: 'policyholder',
  options: [],
  validations: [],
  ...over,
});

describe('toFormFieldConfigs', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => warn.mockRestore());

  it('US-01-AC-01 sorts by order and breaks ties by key', () => {
    const result = toFormFieldConfigs([
      raw({ key: 'c', order: 2 }),
      raw({ key: 'b', order: 1 }),
      raw({ key: 'a', order: 1 }),
    ]);
    expect(result.map((f) => f.key)).toEqual(['a', 'b', 'c']);
  });

  it('US-01-AC-06 sorts select options by order', () => {
    const [f] = toFormFieldConfigs([
      raw({
        key: 's',
        type: 'select',
        options: [
          { value: 'z', label: 'Z', order: 3 },
          { value: 'x', label: 'X', order: 1 },
          { value: 'y', label: 'Y', order: 2 },
        ],
      }),
    ]);
    expect(f.options.map((o) => o.value)).toEqual(['x', 'y', 'z']);
  });

  it('US-01-AC-16 ignores unknown validator with a warning without the value', () => {
    const [f] = toFormFieldConfigs([
      raw({
        key: 'k',
        validations: [
          { type: 'nope', value: 'SECRET-123', message: null },
          { type: 'minLength', value: '2' },
        ],
      }),
    ]);
    expect(f.validations.map((r) => r.type)).toEqual(['minLength']);
    expect(f.validations[0].value).toBe(2);
    expect(warn).toHaveBeenCalledTimes(1);
    const msg = String(warn.mock.calls[0][0]);
    expect(msg).toContain('k');
    expect(msg).toContain('nope');
    expect(msg).not.toContain('SECRET-123');
  });

  it('US-01-AC-16 numeric parameter that does not parse is ignored with a warning', () => {
    const [f] = toFormFieldConfigs([raw({ key: 'k', validations: [{ type: 'min', value: 'abc' }] })]);
    expect(f.validations).toEqual([]);
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0][0])).not.toContain('abc');
  });

  it('US-01-AC-24 skips unknown type, select without options and duplicate keys', () => {
    const result = toFormFieldConfigs([
      raw({ key: 'firstName', order: 1 }),
      raw({ key: 'extra', type: 'slider', order: 2 }),
      raw({ key: 'fuelType', type: 'select', order: 3 }),
      raw({ key: 'plate', order: 5, label: 'second' }),
      raw({ key: 'plate', order: 3, label: 'first' }),
    ]);
    expect(result.map((f) => f.key)).toEqual(['firstName', 'plate']);
    expect(result.find((f) => f.key === 'plate')?.label).toBe('first');
    expect(warn).toHaveBeenCalledTimes(3);
  });
});
