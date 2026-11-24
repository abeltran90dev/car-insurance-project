import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, NEVER, of, throwError } from 'rxjs';
import { CLOCK } from '../../core/clock';
import { CountryContext } from '../../core/country-context';
import { CountryRaw } from '../../core/country-config';
import { QuoteStore } from '../../core/quote-store';
import { StrapiClient } from '../../core/strapi-client';
import { ApplicantForm } from './applicant-form';
import { FormFieldRaw } from './form-field-config';

const COPY = [
  { key: 'form.title', value: 'TITLE' },
  { key: 'form.intro', value: 'INTRO' },
  { key: 'form.loading', value: 'LOADING-MSG' },
  { key: 'form.error', value: 'ERROR-MSG' },
  { key: 'form.empty', value: 'EMPTY-MSG' },
  { key: 'form.genericError', value: 'GENERIC-MSG' },
  { key: 'common.continue', value: 'CONTINUE' },
  { key: 'common.retry', value: 'RETRY' },
];

const country = (code: string, over: Partial<CountryRaw> = {}): CountryRaw => ({
  code,
  name: code,
  numberLocale: 'es-XX',
  currency: 'XXX',
  legalAge: 18,
  copy: COPY,
  ...over,
});

const raw = (over: Partial<FormFieldRaw> & { key: string }): FormFieldRaw => ({
  label: `Label ${over.key}`,
  type: 'text',
  required: true,
  order: 1,
  group: 'policyholder',
  options: [],
  validations: [],
  ...over,
});

type FieldsResponse = Observable<{ data: FormFieldRaw[] }>;

interface Setup {
  fixture: ComponentFixture<ApplicantForm>;
  el: HTMLElement;
  store: QuoteStore;
  navigate: ReturnType<typeof vi.spyOn>;
  get: ReturnType<typeof vi.fn>;
}

async function setup(
  code: string,
  fields: FieldsResponse | FormFieldRaw[],
  opts: { country?: Partial<CountryRaw>; preload?: Record<string, string | number | boolean | null> } = {},
): Promise<Setup> {
  const fieldsStream = Array.isArray(fields) ? of({ data: fields }) : fields;
  const get = vi.fn((path: string) => {
    if (path.startsWith('/countries')) {
      return of({ data: [country(code, opts.country)] });
    }
    if (path.startsWith('/form-fields')) {
      return fieldsStream;
    }
    return throwError(() => new Error(`unexpected ${path}`));
  });
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: StrapiClient, useValue: { get } },
      { provide: CLOCK, useValue: () => new Date(2026, 5, 15) },
    ],
  });
  await TestBed.inject(CountryContext).resolve(code);
  const store = TestBed.inject(QuoteStore);
  store.activate(code);
  if (opts.preload) {
    store.setApplicant(opts.preload);
  }
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(ApplicantForm);
  fixture.detectChanges();
  if (fields !== NEVER) {
    await fixture.whenStable();
  }
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, store, navigate, get };
}

const fieldKeys = (el: HTMLElement): string[] =>
  Array.from(el.querySelectorAll<HTMLElement>('div.field')).map((d) => d.dataset['field']!);
const input = (el: HTMLElement, key: string): HTMLInputElement =>
  el.querySelector<HTMLInputElement>(`#field-${key}`)!;

async function type(s: Setup, key: string, value: string): Promise<void> {
  const control = input(s.el, key);
  control.value = value;
  control.dispatchEvent(new Event('input'));
  s.fixture.detectChanges();
  await s.fixture.whenStable();
}

async function submit(s: Setup): Promise<void> {
  s.el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
  s.fixture.detectChanges();
  await s.fixture.whenStable();
  s.fixture.detectChanges();
}

describe('ApplicantForm', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('US-01-AC-01 renders only the country published fields in order', async () => {
    // The API call is already filtered by country; the component renders what it receives, in order.
    const co = await setup('CO', [
      raw({ key: 'documentNumber', order: 2 }),
      raw({ key: 'documentType', order: 1 }),
      raw({ key: 'plate', order: 3 }),
    ]);
    expect(fieldKeys(co.el)).toEqual(['documentType', 'documentNumber', 'plate']);
    const fieldsCall = co.get.mock.calls.map((c) => String(c[0])).find((p) => p.startsWith('/form-fields'))!;
    expect(decodeURIComponent(fieldsCall)).toContain('filters[country][code][$eq]=CO');
    expect(decodeURIComponent(fieldsCall)).not.toContain('status=');
  });

  it('US-01-AC-01 renders a different field set and order for CL', async () => {
    const cl = await setup('CL', [raw({ key: 'firstName', order: 1 }), raw({ key: 'documentNumber', order: 3 }), raw({ key: 'lastName', order: 2 })]);
    expect(fieldKeys(cl.el)).toEqual(['firstName', 'lastName', 'documentNumber']);
    const fieldsCall = cl.get.mock.calls.map((c) => String(c[0])).find((p) => p.startsWith('/form-fields'))!;
    expect(decodeURIComponent(fieldsCall)).toContain('filters[country][code][$eq]=CL');
  });

  it('US-01-AC-02 shows configured error message and blocks continue', async () => {
    const s = await setup('CO', [
      raw({
        key: 'firstName',
        validations: [{ type: 'minLength', value: '3', message: 'RULE-MSG' }],
      }),
    ]);
    await type(s, 'firstName', 'ab');
    await submit(s);
    expect(s.el.querySelector('#field-firstName-error')?.textContent?.trim()).toBe('RULE-MSG');
    expect(s.navigate).not.toHaveBeenCalled();
    expect(s.store.values()).toEqual({});
  });

  it('US-01-AC-02 error appears after blur, not while typing', async () => {
    const s = await setup('CO', [raw({ key: 'firstName', errorMessage: 'FIELD-MSG' })]);
    expect(s.el.querySelector('#field-firstName-error')).toBeNull();
    input(s.el, 'firstName').dispatchEvent(new Event('blur'));
    s.fixture.detectChanges();
    expect(s.el.querySelector('#field-firstName-error')?.textContent?.trim()).toBe('FIELD-MSG');
  });

  it('US-01-AC-02 valid submit saves normalized values and navigates to planes', async () => {
    const s = await setup('CL', [
      raw({ key: 'firstName', order: 1 }),
      raw({ key: 'documentNumber', order: 2, validations: [{ type: 'rut', value: null }] }),
    ]);
    await type(s, 'firstName', '  Ana  ');
    await type(s, 'documentNumber', '11.111.111-1');
    await submit(s);
    expect(s.navigate).toHaveBeenCalledWith(['/', 'cl', 'planes']);
    expect(s.store.values()).toEqual({ firstName: 'Ana', documentNumber: '11111111-1' });
  });

  it('US-01-AC-03 renders a newly published field without code changes', async () => {
    const before = await setup('CO', [raw({ key: 'firstName' })]);
    expect(fieldKeys(before.el)).toEqual(['firstName']);
    TestBed.resetTestingModule();
    const after = await setup('CO', [raw({ key: 'firstName', order: 1 }), raw({ key: 'brandNewField', order: 2, label: 'Brand new' })]);
    expect(fieldKeys(after.el)).toEqual(['firstName', 'brandNewField']);
    expect(after.el.querySelector('label[for="field-brandNewField"]')?.textContent).toBe('Brand new');
  });

  it('US-01-AC-06 renders select options from Strapi in order', async () => {
    const s = await setup('CO', [
      raw({
        key: 'city',
        type: 'select',
        placeholder: 'Pick',
        options: [
          { value: 'c', label: 'Third', order: 3 },
          { value: 'a', label: 'First', order: 1 },
          { value: 'b', label: 'Second', order: 2 },
        ],
      }),
    ]);
    const options = Array.from(s.el.querySelectorAll<HTMLOptionElement>('#field-city option'));
    const real = options.filter((o) => o.value !== '');
    expect(real.map((o) => o.value)).toEqual(['a', 'b', 'c']);
    expect(real.map((o) => o.textContent?.trim())).toEqual(['First', 'Second', 'Third']);
    expect(options.length).toBe(real.length + 1); // one empty placeholder option, nothing else
  });

  it('US-01-AC-11 focuses first invalid field on continue', async () => {
    const s = await setup('CO', [
      raw({ key: 'aaa', order: 1 }),
      raw({ key: 'bbb', order: 2, errorMessage: 'BBB-MSG' }),
      raw({ key: 'ccc', order: 3 }),
    ]);
    document.body.appendChild(s.el); // focus requires attachment to the document
    await type(s, 'aaa', 'ok');
    await submit(s);
    expect(document.activeElement).toBe(input(s.el, 'bbb'));
    for (const key of ['bbb', 'ccc']) {
      const control = input(s.el, key);
      expect(control.getAttribute('aria-invalid')).toBe('true');
      expect(control.getAttribute('aria-describedby')).toContain(`field-${key}-error`);
      expect(s.el.querySelector(`#field-${key}-error`)).not.toBeNull();
    }
    expect(input(s.el, 'aaa').getAttribute('aria-invalid')).toBeNull();
    s.el.remove();
  });

  it('US-01-AC-11 labels, help text and required state are exposed accessibly', async () => {
    const s = await setup('CO', [raw({ key: 'aaa', helpText: 'HELP' })]);
    expect(s.el.querySelector('label[for="field-aaa"]')?.textContent).toBe('Label aaa');
    expect(input(s.el, 'aaa').getAttribute('aria-describedby')).toContain('field-aaa-help');
    expect(s.el.querySelector('#field-aaa-help')?.textContent).toBe('HELP');
    expect(input(s.el, 'aaa').getAttribute('aria-required')).toBe('true');
  });

  it('US-01-AC-13 isolates wizard state per country', async () => {
    const co = await setup('CO', [raw({ key: 'firstName' })]);
    await type(co, 'firstName', 'Ana');
    await submit(co);
    expect(sessionStorage.getItem('quote:v1:CO')).toContain('Ana');
    TestBed.resetTestingModule();
    // Fresh app session in the same tab: CL must start empty, CO data must remain stored.
    const cl = await setup('CL', [raw({ key: 'firstName' })]);
    expect(input(cl.el, 'firstName').value).toBe('');
    expect(cl.store.values()).toEqual({});
    expect(sessionStorage.getItem('quote:v1:CO')).toContain('Ana');
  });

  it('US-01-AC-13 switching country within one session does not leak values', async () => {
    const s = await setup('CO', [raw({ key: 'firstName' })], { preload: { firstName: 'Ana' } });
    s.store.activate('CL');
    expect(s.store.values()).toEqual({});
    s.store.activate('CO');
    expect(s.store.values()).toEqual({ firstName: 'Ana' });
  });

  it('US-01-AC-04 restores stored values when the form is reopened (unit part)', async () => {
    const s = await setup('CO', [raw({ key: 'firstName' }), raw({ key: 'accept', type: 'checkbox', order: 2 })], {
      preload: { firstName: 'Ana', accept: true },
    });
    expect(input(s.el, 'firstName').value).toBe('Ana');
    expect(input(s.el, 'accept').checked).toBe(true);
  });

  it('US-01-AC-14 renders CMS text as plain text', async () => {
    const html = '<img src=x onerror=alert(1)><b>bold</b>';
    const s = await setup('CO', [raw({ key: 'firstName', label: html, helpText: html, errorMessage: html })], {
      country: { copy: COPY.map((c) => (c.key === 'form.title' ? { ...c, value: html } : c)) },
    });
    await submit(s);
    expect(s.el.querySelector('img')).toBeNull();
    expect(s.el.querySelector('b')).toBeNull();
    expect(s.el.querySelector('label[for="field-firstName"]')?.textContent).toBe(html);
    expect(s.el.querySelector('#field-firstName-help')?.textContent).toBe(html);
    expect(s.el.querySelector('#field-firstName-error')?.textContent?.trim()).toBe(html);
    expect(s.el.querySelector('h1')?.textContent).toBe(html);
  });

  it('US-01-AC-16 form still renders when a field has an unknown validator, warning has no value', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const s = await setup('CO', [
      raw({ key: 'firstName', validations: [{ type: 'mystery', value: 'TOP-SECRET' }] }),
    ]);
    expect(fieldKeys(s.el)).toEqual(['firstName']);
    await type(s, 'firstName', 'Ana');
    await submit(s);
    expect(s.navigate).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    for (const call of warn.mock.calls) {
      expect(String(call[0])).not.toContain('TOP-SECRET');
      expect(String(call[0])).not.toContain('Ana');
    }
  });

  it('US-01-AC-19 falls back to country generic error message in the UI', async () => {
    const s = await setup('CO', [raw({ key: 'firstName' })]);
    await submit(s);
    expect(s.el.querySelector('#field-firstName-error')?.textContent?.trim()).toBe('GENERIC-MSG');
  });

  it('US-01-AC-24 skips misconfigured fields with a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const s = await setup('CO', [
      raw({ key: 'firstName', order: 1 }),
      raw({ key: 'extra', type: 'slider', order: 2 }),
      raw({ key: 'fuelType', type: 'select', order: 3, options: [] }),
      raw({ key: 'plate', order: 3, label: 'first' }),
      raw({ key: 'plate', order: 5, label: 'second' }),
      raw({ key: 'birthDate', type: 'date', order: 6, validations: [{ type: 'minAge', value: null }] }),
    ], { country: { legalAge: undefined as unknown as number } });
    expect(fieldKeys(s.el)).toEqual(['firstName', 'plate', 'birthDate']);
    expect(s.el.querySelector('label[for="field-plate"]')?.textContent).toBe('first');
    await type(s, 'firstName', 'Ana');
    await type(s, 'plate', 'ABC123');
    await type(s, 'birthDate', '1990-01-01');
    await submit(s);
    expect(s.navigate).not.toHaveBeenCalled(); // birthDate fails closed
    expect(s.el.querySelector('#field-birthDate-error')).not.toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it('US-01-AC-17 shows error state and retries', async () => {
    let calls = 0;
    const stream = new Observable<{ data: FormFieldRaw[] }>((sub) => {
      calls++;
      if (calls === 1) {
        sub.error(new Error('boom'));
      } else {
        sub.next({ data: [raw({ key: 'firstName' })] });
        sub.complete();
      }
    });
    const s = await setup('CO', stream);
    expect(s.el.querySelector('[data-testid=form-error]')?.textContent).toContain('ERROR-MSG');
    expect(s.el.querySelector('button[type=submit]')).toBeNull();
    const retry = Array.from(s.el.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'RETRY')!;
    retry.click();
    s.fixture.detectChanges();
    await s.fixture.whenStable();
    s.fixture.detectChanges();
    expect(fieldKeys(s.el)).toEqual(['firstName']);
    expect(calls).toBe(2);
  });

  it('US-01-AC-18 shows empty state when no fields', async () => {
    const s = await setup('CO', []);
    expect(s.el.querySelector('[data-testid=form-empty]')?.textContent).toContain('EMPTY-MSG');
    expect(s.el.querySelector('button[type=submit]')).toBeNull();
  });

  it('US-01-AC-20 discards stored value of removed field', async () => {
    const s = await setup('CO', [raw({ key: 'firstName' })], { preload: { firstName: 'Ana', removedField: 'OLD' } });
    expect(fieldKeys(s.el)).toEqual(['firstName']);
    await submit(s);
    expect(s.store.values()).toEqual({ firstName: 'Ana' });
  });

  it('US-01-AC-25 shows loading state while configuration loads', async () => {
    const s = await setup('CO', NEVER);
    const loading = s.el.querySelector('[data-testid=form-loading]');
    expect(loading?.getAttribute('aria-live')).toBe('polite');
    expect(loading?.textContent).toContain('LOADING-MSG');
    expect(s.el.querySelector('div.field')).toBeNull();
    expect(s.el.querySelector('button[type=submit]')).toBeNull();
  });
});
