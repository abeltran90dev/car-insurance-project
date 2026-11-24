import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { of } from 'rxjs';
import { CLOCK } from '../../core/clock';
import { CountryContext } from '../../core/country-context';
import { CountryRaw } from '../../core/country-config';
import { QuoteStore } from '../../core/quote-store';
import { StrapiClient } from '../../core/strapi-client';
import { summaryGuard } from './summary-guard';

const country: CountryRaw = {
  code: 'XX',
  name: 'Testland',
  numberLocale: 'es-CO',
  currency: 'COP',
  legalAge: 18,
  copy: [],
};

async function run(planDocumentId: string | null): Promise<unknown> {
  const get = vi.fn((path: string) => {
    if (path.startsWith('/countries')) return of({ data: [country] });
    if (path.startsWith('/form-fields')) {
      return of({ data: [{ key: 'firstName', label: 'Name', type: 'text', order: 1, group: 'policyholder' }] });
    }
    throw new Error(`unexpected ${path}`);
  });
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: StrapiClient, useValue: { get } },
      { provide: CLOCK, useValue: () => new Date(2026, 10, 23) },
    ],
  });
  await TestBed.inject(CountryContext).resolve('XX');
  const store = TestBed.inject(QuoteStore);
  store.activate('XX');
  store.setApplicant({ firstName: 'Ana' });
  store.selectPlan(planDocumentId);
  return TestBed.runInInjectionContext(() =>
    summaryGuard({} as ActivatedRouteSnapshot, { url: '/xx/resumen' } as RouterStateSnapshot),
  );
}

describe('US-03 summary guard (unit)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  // BUG: summaryGuard calls inject() after `await plansGuard(...)`, outside the injection context (NG0203),
  // so the guard rejects whenever step 1 is valid. See TW-BUG-01.
  it('US-03-AC-11 summary guard allows entry when step 1 is valid and a plan is selected', async () => {
    await expect(run('plan-1')).resolves.toBe(true);
  });

  // BUG: same cause as above (TW-BUG-01).
  it('US-03-AC-11 summary guard redirects to planes when step 1 is valid and no plan is selected', async () => {
    const result = await run(null);
    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result)).toBe('/xx/planes');
  });
});
