import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { routes } from '../../app.routes';
import { CLOCK } from '../../core/clock';
import { StrapiClient } from '../../core/strapi-client';

const COPY = [
  { key: 'plans.title', value: 'TITLE' },
  { key: 'plans.loading', value: 'LOADING-MSG' },
  { key: 'plans.error', value: 'ERROR-MSG' },
  { key: 'plans.empty', value: 'EMPTY-MSG' },
  { key: 'common.continue', value: 'CONTINUE' },
  { key: 'common.retry', value: 'RETRY' },
  { key: 'form.genericError', value: 'GENERIC' },
];
const countryRaw = {
  code: 'CL',
  name: 'CL',
  numberLocale: 'es-CL',
  currency: 'CLP',
  legalAge: 18,
  copy: COPY,
};
const fieldRaw = {
  key: 'firstName',
  label: 'Nombre',
  type: 'text',
  required: true,
  order: 1,
  group: 'policyholder',
  options: [],
  validations: [],
};
const planRaw = {
  documentId: 'p1',
  name: 'Plan Uno',
  shortDescription: null,
  basePrice: 1000,
  currency: 'CLP',
  order: 1,
  recommended: false,
  coverages: [],
  benefits: [],
};

async function boot(opts: { country: () => Observable<{ data: unknown[] }>; plans?: () => Observable<unknown> }) {
  const get = vi.fn((path: string) => {
    const decoded = decodeURIComponent(path);
    if (decoded.startsWith('/countries')) return opts.country();
    if (decoded.startsWith('/form-fields')) return of({ data: [fieldRaw] });
    if (decoded.startsWith('/plans')) return opts.plans ? opts.plans() : of({ data: [planRaw] });
    return throwError(() => new Error(`unexpected ${path}`));
  });
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      { provide: StrapiClient, useValue: { get } },
      { provide: CLOCK, useValue: () => new Date(2026, 5, 15) },
    ],
  });
  return RouterTestingHarness.create();
}

const settle = async (h: RouterTestingHarness) => {
  for (let i = 0; i < 4; i++) {
    h.detectChanges();
    await h.fixture.whenStable();
    await new Promise((r) => setTimeout(r, 10));
  }
  h.detectChanges();
};
const tick = async (h: RouterTestingHarness) => {
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 20));
    h.detectChanges();
  }
};
const root = (h: RouterTestingHarness) => h.fixture.nativeElement as HTMLElement;
const retryBtn = (h: RouterTestingHarness) =>
  Array.from(root(h).querySelectorAll('button')).find((b) => b.textContent?.trim().length) as HTMLButtonElement;
const storeStep1 = (values: Record<string, unknown>) =>
  sessionStorage.setItem('quote:v1:CL', JSON.stringify({ v: 1, country: 'CL', values, planDocumentId: null }));

describe('US-02 fix-round regressions', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });
  afterEach(() => sessionStorage.clear());

  it('US-02-AC-15 retry re-resolves country after a failed load and renders plans (REVIEW-US-02-F01)', async () => {
    storeStep1({ firstName: 'Luis' });
    let down = true;
    const h = await boot({ country: () => (down ? throwError(() => new Error('down')) : of({ data: [countryRaw] })) });
    await h.navigateByUrl('/cl/planes');
    await settle(h);
    expect(root(h).querySelector('[data-testid=plans-error]')).not.toBeNull();
    expect(root(h).querySelectorAll('[data-testid=plan-card]').length).toBe(0);

    down = false;
    retryBtn(h).click();
    await settle(h);
    expect(TestBed.inject(Router).url).toBe('/cl/planes');
    expect(root(h).querySelectorAll('[data-testid=plan-card]').length).toBe(1);
    expect(root(h).querySelector('[data-testid=plans-error]')).toBeNull();
  });

  it('US-02-AC-10 retry after failed country load redirects to step 1 when step 1 is invalid (REVIEW-US-02-F01)', async () => {
    let down = true;
    const h = await boot({ country: () => (down ? throwError(() => new Error('down')) : of({ data: [countryRaw] })) });
    await h.navigateByUrl('/cl/planes');
    await settle(h);
    expect(root(h).querySelector('[data-testid=plans-error]')).not.toBeNull();

    down = false;
    retryBtn(h).click();
    await settle(h);
    expect(TestBed.inject(Router).url).toBe('/cl/datos');
    expect(root(h).querySelectorAll('[data-testid=plan-card]').length).toBe(0);
  });

  it('US-02-AC-14 announces states in one persistent polite live region (REVIEW-US-02-F02)', async () => {
    storeStep1({ firstName: 'Luis' });
    const plans$ = new Subject<unknown>();
    const h = await boot({ country: () => of({ data: [countryRaw] }), plans: () => plans$ });
    // Pending HTTP keeps the app unstable, so do not wait for stability while loading.
    void TestBed.inject(Router).navigateByUrl('/cl/planes');
    await tick(h);

    const region = root(h).querySelector('[aria-live="polite"]') as HTMLElement;
    expect(region).not.toBeNull();
    expect(region.textContent).toContain('LOADING-MSG');
    expect(root(h).querySelector('[role="alert"]')).toBeNull();

    plans$.error(new Error('boom'));
    await tick(h);
    expect(root(h).querySelector('[aria-live="polite"]')).toBe(region); // same node, not re-created
    expect(region.textContent).toContain('ERROR-MSG');
    expect(root(h).querySelector('[role="alert"]')).toBeNull();
    expect(root(h).querySelectorAll('[aria-live]').length).toBe(1);
  });

  it('US-02-AC-14 empty state text is announced in the same polite live region (REVIEW-US-02-F02)', async () => {
    storeStep1({ firstName: 'Luis' });
    const h = await boot({ country: () => of({ data: [countryRaw] }), plans: () => of({ data: [] }) });
    await h.navigateByUrl('/cl/planes');
    await settle(h);
    const region = root(h).querySelector('[aria-live="polite"]') as HTMLElement;
    expect(region.textContent).toContain('EMPTY-MSG');
    expect(root(h).querySelector('[role="alert"]')).toBeNull();
  });
});
