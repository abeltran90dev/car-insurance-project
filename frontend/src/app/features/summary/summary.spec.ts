import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { CLOCK } from '../../core/clock';
import { CountryContext } from '../../core/country-context';
import { CountryRaw } from '../../core/country-config';
import { QuoteStore } from '../../core/quote-store';
import { StrapiClient } from '../../core/strapi-client';
import { FormFieldConfig, FormFieldRaw } from '../applicant-form/form-field-config';
import { PlanRaw } from '../plan-list/plan';
import { ConfirmationStore } from './confirmation-store';
import { maskDocument } from './mask';
import { PAYMENT_DELAY_MS } from './payment-settings';
import { generateQuoteNumber } from './quote-number';
import { Summary } from './summary';
import { buildRows } from './summary-model';

const TODAY = new Date(2026, 10, 23);

const COPY = [
  ['summary.title', 'TITLE'],
  ['summary.loading', 'LOADING'],
  ['summary.policyholderTitle', 'HOLDER'],
  ['summary.vehicleTitle', 'VEHICLE'],
  ['summary.planTitle', 'PLAN'],
  ['summary.priceLabel', 'PRICE'],
  ['summary.editData', 'EDIT'],
  ['summary.changePlan', 'CHANGE'],
  ['summary.termsAccept', 'ACCEPT'],
  ['summary.termsUnavailable', 'NO-TERMS'],
  ['payment.pay', 'PAY'],
  ['payment.gatewayTitle', 'GATEWAY'],
  ['payment.simulateApprove', 'APPROVE'],
  ['payment.simulateReject', 'REJECT'],
  ['payment.cancel', 'CANCEL'],
  ['payment.processing', 'PROCESSING'],
  ['payment.rejected', 'REJECTED'],
].map(([key, value]) => ({ key, value }));

const country = (over: Partial<CountryRaw> = {}): CountryRaw => ({
  code: 'XX',
  name: 'Testland',
  numberLocale: 'es-CO',
  currency: 'COP',
  legalAge: 18,
  termsTitle: 'TERMS-TITLE',
  termsBody: 'TERMS-BODY',
  copy: COPY,
  ...over,
});

const plan: PlanRaw = {
  documentId: 'plan-1',
  name: 'Plan Uno',
  shortDescription: null,
  basePrice: 1000,
  currency: 'COP',
  order: 1,
  recommended: false,
  coverages: [],
  benefits: [],
};

const fields: FormFieldRaw[] = [
  { key: 'documentNumber', label: 'Doc', type: 'text', order: 1, group: 'policyholder', maskInSummary: true },
  { key: 'year', label: 'Year', type: 'number', order: 2, group: 'vehicle', validations: [{ type: 'vehicleYear' }] },
];

async function setup(
  countryRaw: CountryRaw,
  delayMs = 1500,
): Promise<{ fixture: ComponentFixture<Summary>; el: HTMLElement; set: ReturnType<typeof vi.spyOn> }> {
  const get = vi.fn((path: string) => {
    if (path.startsWith('/countries')) return of({ data: [countryRaw] });
    if (path.startsWith('/form-fields')) return of({ data: fields });
    if (path.startsWith('/plans')) return of({ data: [plan] });
    throw new Error(`unexpected ${path}`);
  });
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: StrapiClient, useValue: { get } },
      { provide: CLOCK, useValue: () => TODAY },
      { provide: PAYMENT_DELAY_MS, useValue: delayMs },
    ],
  });
  await TestBed.inject(CountryContext).resolve('XX');
  const store = TestBed.inject(QuoteStore);
  store.activate('XX');
  store.setApplicant({ documentNumber: '1111111111', year: 2023 });
  store.selectPlan('plan-1');
  vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const set = vi.spyOn(TestBed.inject(ConfirmationStore), 'set');
  const fixture = TestBed.createComponent(Summary);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, set };
}

const button = (el: HTMLElement, label: string) =>
  Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === label) as HTMLButtonElement;

describe('US-03 summary (unit)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });
  afterEach(() => vi.useRealTimers());

  describe('US-03-AC-05 masks document leaving last 4 characters', () => {
    it('US-03-AC-05 masks document leaving last 4 characters (CO)', () => {
      expect(maskDocument('1111111111')).toBe('******1111');
    });
    it('US-03-AC-05 masks document leaving last 4 characters (CL, dots and hyphen removed)', () => {
      expect(maskDocument('11.111.111-1')).toBe('*****1111');
    });
    it('US-03-AC-05 masks document leaving last 4 characters (upper-cases letters, drops spaces)', () => {
      // normalized "12345678K" (9 chars): 5 asterisks + last 4 "678K"
      expect(maskDocument('12.345.678-k')).toBe('*****678K');
      expect(maskDocument(' 11 222 ')).toBe('*1222');
    });
    it('US-03-AC-05 masks document leaving last 4 characters (short values fully masked)', () => {
      expect(maskDocument('1234')).toBe('****');
      expect(maskDocument('12')).toBe('**');
    });
    it('US-03-AC-05 masks document leaving last 4 characters (row chosen by maskInSummary only)', () => {
      const cfg = [
        { key: 'documentNumber', label: 'Doc', type: 'text', group: 'policyholder', maskInSummary: true, options: [], validations: [] },
        { key: 'phone', label: 'Phone', type: 'text', group: 'policyholder', maskInSummary: false, options: [], validations: [] },
      ] as unknown as FormFieldConfig[];
      const rows = buildRows(cfg, { documentNumber: '1111111111', phone: '3001234567' }, 'policyholder', {
        numberLocale: 'es-CO',
        yes: 'Si',
        no: 'No',
      });
      expect(rows.find((r) => r.key === 'documentNumber')?.displayValue).toBe('******1111');
      expect(rows.find((r) => r.key === 'phone')?.displayValue).toBe('3001234567');
    });
    it('US-03-AC-05 masks document leaving last 4 characters (full value not in rendered DOM)', async () => {
      const { el } = await setup(country());
      expect(el.textContent).toContain('******1111');
      expect(el.innerHTML).not.toContain('1111111111');
    });
  });

  describe('US-03-AC-09 quote number matches pattern', () => {
    it('US-03-AC-09 quote number matches pattern (CL, fixed clock 2026-11-23)', () => {
      expect(generateQuoteNumber('CL', new Date(2026, 10, 23))).toMatch(/^COT-CL-20261123-[A-Z0-9]{6}$/);
    });
    it('US-03-AC-09 quote number matches pattern (CO, zero-padded date)', () => {
      expect(generateQuoteNumber('CO', new Date(2026, 0, 5))).toMatch(/^COT-CO-20260105-[A-Z0-9]{6}$/);
    });
    it('US-03-AC-09 quote number matches pattern (random suffix varies)', () => {
      const all = new Set(Array.from({ length: 20 }, () => generateQuoteNumber('CO', TODAY)));
      expect(all.size).toBeGreaterThan(1);
    });
  });

  it('US-03-AC-08 double click produces a single payment', async () => {
    const { fixture, el, set } = await setup(country(), 1500);
    vi.useFakeTimers();
    (el.querySelector('#terms-accept') as HTMLInputElement).click();
    fixture.detectChanges();
    button(el, 'PAY').click();
    fixture.detectChanges();
    const approve = button(el, 'APPROVE');
    approve.click();
    approve.click();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(5000);
    fixture.detectChanges();
    expect(set).toHaveBeenCalledTimes(1);
    expect(set.mock.calls[0][0].quoteNumber).toMatch(/^COT-XX-20261123-[A-Z0-9]{6}$/);
  });

  it('US-03-AC-02 terms from Strapi per country gate the pay button', async () => {
    const { fixture, el } = await setup(country({ termsTitle: 'T-XX', termsBody: 'BODY-XX' }));
    expect(el.querySelector('[data-testid="terms"]')?.textContent).toContain('T-XX');
    expect(el.querySelector('[data-testid="terms-body"]')?.textContent?.trim()).toBe('BODY-XX');
    expect(button(el, 'PAY').disabled).toBe(true);
    (el.querySelector('#terms-accept') as HTMLInputElement).click();
    fixture.detectChanges();
    expect(button(el, 'PAY').disabled).toBe(false);
  });

  it('US-03-AC-02 unchecking terms while the gateway is open blocks approval', async () => {
    const { fixture, el, set } = await setup(country(), 0);
    document.body.appendChild(el); // focus assertions need an attached element
    const box = el.querySelector('#terms-accept') as HTMLInputElement;
    box.click();
    fixture.detectChanges();
    button(el, 'PAY').click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="gateway"]')).not.toBeNull();
    box.focus(); // a synthetic click does not move focus; a real user click does
    box.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(box.checked).toBe(false);
    expect(el.querySelector('[data-testid="gateway"]')).toBeNull();
    expect(button(el, 'APPROVE')).toBeUndefined();
    expect(button(el, 'PAY').disabled).toBe(true);
    expect(document.activeElement).toBe(box);
    expect(set).not.toHaveBeenCalled();
  });

  it('US-03-AC-14 missing terms disable payment', async () => {
    const { el } = await setup(country({ termsBody: '' }));
    expect(el.querySelector('[data-testid="terms-unavailable"]')?.textContent).toContain('NO-TERMS');
    expect((el.querySelector('#terms-accept') as HTMLInputElement).disabled).toBe(true);
    expect(button(el, 'PAY').disabled).toBe(true);
  });

  it('US-03-AC-14 missing terms disable payment (null termsBody)', async () => {
    const { el } = await setup(country({ termsBody: null }));
    expect(el.querySelector('[data-testid="terms-unavailable"]')).not.toBeNull();
    expect(button(el, 'PAY').disabled).toBe(true);
  });
});
