import { copy, toCountryConfig } from './country-config';

describe('country-config', () => {
  const raw = {
    code: 'XX',
    name: 'Testland',
    numberLocale: 'es-XX',
    currency: 'XXX',
    legalAge: 18,
    copy: [{ key: 'common.continue', value: 'Continuar' }],
  };

  it('maps the copy array to a record and defaults terms', () => {
    const config = toCountryConfig(raw);
    expect(config.copy).toEqual({ 'common.continue': 'Continuar' });
    expect(config.termsBody).toBe('');
  });

  it('returns the key and warns when the copy key is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(copy(toCountryConfig(raw), 'nope.missing')).toBe('nope.missing');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
