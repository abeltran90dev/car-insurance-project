import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { CLOCK } from '../../core/clock';
import { CountryContext } from '../../core/country-context';
import { CountryRaw } from '../../core/country-config';
import { QuoteStore } from '../../core/quote-store';
import { StrapiClient } from '../../core/strapi-client';
import { FormFieldRaw } from '../applicant-form/form-field-config';
import { PlanList } from './plan-list';
import { PlanRaw, toPlans } from './plan';
import { computeFinalPrice } from './pricing';

const TODAY = new Date(2026, 5, 15); // fixed clock: year 2026

const COPY = [
  { key: 'plans.title', value: 'TITLE' },
  { key: 'plans.loading', value: 'LOADING-MSG' },
  { key: 'plans.error', value: 'ERROR-MSG' },
  { key: 'plans.empty', value: 'EMPTY-MSG' },
  { key: 'plans.recommendedBadge', value: 'BADGE' },
  { key: 'plans.priceLabel', value: 'PRICE' },
  { key: 'plans.pricePeriod', value: '/yr' },
  { key: 'plans.priceNote', value: 'NOTE' },
  { key: 'plans.coveragesHeading', value: 'COVERAGES' },
  { key: 'plans.benefitsHeading', value: 'BENEFITS' },
  { key: 'common.continue', value: 'CONTINUE' },
  { key: 'common.back', value: 'BACK' },
  { key: 'common.retry', value: 'RETRY' },
];

const country: CountryRaw = {
  code: 'XX',
  name: 'Testland',
  numberLocale: 'es-CO',
  currency: 'COP',
  legalAge: 18,
  copy: COPY,
};

const plan = (over: Partial<PlanRaw> & { documentId: string; name: string }): PlanRaw => ({
  shortDescription: null,
  basePrice: 1000,
  currency: 'COP',
  order: 1,
  recommended: false,
  coverages: [],
  benefits: [],
  ...over,
});

const yearField: FormFieldRaw = {
  key: 'year',
  label: 'Year',
  type: 'number',
  order: 1,
  group: 'vehicle',
  validations: [{ type: 'vehicleYear' }],
};

interface Setup {
  fixture: ComponentFixture<PlanList>;
  el: HTMLElement;
  store: QuoteStore;
  navigate: ReturnType<typeof vi.spyOn>;
}

async function setup(
  plans: PlanRaw[] | Observable<{ data: PlanRaw[] }>,
  opts: { fields?: FormFieldRaw[]; selected?: string | null; values?: Record<string, number> } = {},
): Promise<Setup> {
  const plansStream = Array.isArray(plans) ? of({ data: plans }) : plans;
  const get = vi.fn((path: string) => {
    if (path.startsWith('/countries')) return of({ data: [country] });
    if (path.startsWith('/form-fields')) return of({ data: opts.fields ?? [yearField] });
    if (path.startsWith('/plans')) return plansStream;
    throw new Error(`unexpected ${path}`);
  });
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: StrapiClient, useValue: { get } },
      { provide: CLOCK, useValue: () => TODAY },
    ],
  });
  await TestBed.inject(CountryContext).resolve('XX');
  const store = TestBed.inject(QuoteStore);
  store.activate('XX');
  store.setApplicant(opts.values ?? { year: 2023 });
  if (opts.selected !== undefined) store.selectPlan(opts.selected);
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(PlanList);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, store, navigate };
}

const continueButton = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('CONTINUE')) as HTMLButtonElement | undefined;

describe('US-02 pricing and plan list (unit)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  describe('US-02-AC-05 computes final price by vehicle age', () => {
    const cases: Array<[number, number, number]> = [
      [2027, 850000, 850000],
      [2021, 850000, 850000],
      [2020, 850000, 977500],
      [2016, 850000, 977500],
      [2015, 850000, 1105000],
      [2006, 850000, 1105000],
      [2020, 33333, 38333],
    ];
    for (const [year, base, final] of cases) {
      it(`US-02-AC-05 computes final price by vehicle age (year ${year}, base ${base} -> ${final})`, () => {
        expect(computeFinalPrice(base, year, TODAY)).toBe(final);
      });
    }
  });

  it('US-02-AC-17 uses factor 1 when vehicle year is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(computeFinalPrice(850000, null, TODAY)).toBe(850000);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('US-02-AC-17 uses factor 1 when no step 1 field uses the vehicleYear validator', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const noYear: FormFieldRaw = { ...yearField, validations: [] };
    const { el } = await setup([plan({ documentId: 'a', name: 'Plan A', basePrice: 850000 })], {
      fields: [noYear],
      values: { year: 2006 },
    });
    const expected = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(850000);
    expect(el.querySelector('[data-testid="plan-price"]')?.textContent?.trim()).toBe(expected);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('US-02-AC-04 shows empty state when no plans', async () => {
    const { el } = await setup([]);
    expect(el.querySelector('[data-testid="plans-empty"]')?.textContent).toContain('EMPTY-MSG');
    expect(el.querySelectorAll('input[type=radio]').length).toBe(0);
    expect(continueButton(el)).toBeUndefined();
    expect(Array.from(el.querySelectorAll('button')).some((b) => b.textContent?.includes('BACK'))).toBe(true);
  });

  it('US-02-AC-09 disables continue until a plan is selected', async () => {
    const { el, fixture } = await setup([plan({ documentId: 'a', name: 'Plan A' }), plan({ documentId: 'b', name: 'Plan B', order: 2 })]);
    expect(el.querySelectorAll('input[type=radio]:checked').length).toBe(0);
    expect(continueButton(el)?.disabled).toBe(true);

    const radio = el.querySelector('input[type=radio]') as HTMLInputElement;
    radio.click();
    fixture.detectChanges();
    expect(continueButton(el)?.disabled).toBe(false);
  });

  it('US-02-AC-12 clears selection of a plan no longer offered', async () => {
    const { el, store } = await setup([plan({ documentId: 'a', name: 'Plan A' })], { selected: 'gone-id' });
    expect(store.planDocumentId()).toBeNull();
    expect(el.querySelectorAll('input[type=radio]:checked').length).toBe(0);
    expect(continueButton(el)?.disabled).toBe(true);
  });

  it('US-02-AC-12 keeps selection of a plan that is still offered', async () => {
    const { store, el } = await setup([plan({ documentId: 'a', name: 'Plan A' })], { selected: 'a' });
    expect(store.planDocumentId()).toBe('a');
    expect(continueButton(el)?.disabled).toBe(false);
  });

  it('US-02-AC-16 hides plans with wrong currency or invalid price', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const result = toPlans(
      [
        plan({ documentId: 'x', name: 'Plan X', currency: 'CLP' }),
        plan({ documentId: 'y', name: 'Plan Y', basePrice: 0 }),
        plan({ documentId: 'ok', name: 'Plan OK', basePrice: 850000 }),
      ],
      'COP',
    );
    expect(result.map((p) => p.name)).toEqual(['Plan OK']);
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages.some((m) => m.includes('Plan X'))).toBe(true);
    expect(messages.some((m) => m.includes('Plan Y'))).toBe(true);
    warn.mockRestore();
  });

  it('US-02-AC-16 hides plans with wrong currency or invalid price (rendered)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { el } = await setup([
      plan({ documentId: 'x', name: 'Plan X', currency: 'CLP' }),
      plan({ documentId: 'y', name: 'Plan Y', basePrice: 0 }),
      plan({ documentId: 'ok', name: 'Plan OK' }),
    ]);
    const names = Array.from(el.querySelectorAll('.plan__name')).map((n) => n.textContent?.trim());
    expect(names).toEqual(['Plan OK']);
    warn.mockRestore();
  });

  it('US-02-AC-18 renders CMS text as plain text', async () => {
    const payload = '<img src=x onerror=alert(1)>Texto';
    const { el } = await setup([
      plan({ documentId: 'a', name: 'Plan A', shortDescription: payload, benefits: [] }),
    ]);
    const description = el.querySelector('.plan__description');
    expect(description?.textContent).toContain(payload);
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).not.toContain('BENEFITS');
  });
});
