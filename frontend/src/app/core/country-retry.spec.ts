import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, of, throwError } from 'rxjs';
import { routes } from '../app.routes';
import { CLOCK } from './clock';
import { StrapiClient } from './strapi-client';

const COPY = [
  { key: 'form.title', value: 'TITLE' },
  { key: 'form.genericError', value: 'GENERIC-MSG' },
  { key: 'common.continue', value: 'CONTINUE' },
  { key: 'common.retry', value: 'RETRY' },
  { key: 'form.error', value: 'ERROR-MSG' },
];
const countryRaw = (code: string) => ({
  code,
  name: code,
  numberLocale: 'es-XX',
  currency: 'XXX',
  legalAge: 18,
  copy: COPY,
});
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

async function boot(clCountry: () => Observable<{ data: unknown[] }>) {
  const get = vi.fn((path: string) => {
    const decoded = decodeURIComponent(path);
    if (decoded.startsWith('/countries')) {
      if (decoded.includes('$eq]=CL')) {
        return clCountry();
      }
      if (decoded.includes('$eq]=CO')) {
        return of({ data: [countryRaw('CO')] });
      }
    }
    if (decoded.startsWith('/form-fields')) {
      return of({ data: [fieldRaw] });
    }
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
  h.detectChanges();
  await h.fixture.whenStable();
  h.detectChanges();
};
const retryButton = (h: RouterTestingHarness) =>
  Array.from(h.fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
    (b) => b.textContent?.trim().length && !b.matches('[type=submit]'),
  )!;
const root = (h: RouterTestingHarness) => h.fixture.nativeElement as HTMLElement;

describe('country retry after lookup failure', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('US-01-AC-13 retry activates the new country slot, keeping CO data untouched (REVIEW-US-01-F01)', async () => {
    sessionStorage.setItem(
      'quote:v1:CO',
      JSON.stringify({ v: 1, country: 'CO', values: { firstName: 'Ana' }, planDocumentId: null }),
    );
    let clFails = true;
    const h = await boot(() => (clFails ? throwError(() => new Error('down')) : of({ data: [countryRaw('CL')] })));

    await h.navigateByUrl('/co/datos');
    await settle(h);
    expect((root(h).querySelector('#field-firstName') as HTMLInputElement).value).toBe('Ana');

    await h.navigateByUrl('/cl/datos');
    await settle(h);
    expect(root(h).querySelector('[data-testid=form-error]')).not.toBeNull();
    expect(root(h).querySelector('form')).toBeNull();

    clFails = false;
    retryButton(h).click();
    await settle(h);
    await settle(h);
    const clInput = root(h).querySelector('#field-firstName') as HTMLInputElement;
    expect(clInput).not.toBeNull();
    expect(clInput.value).toBe('');

    clInput.value = 'Luis';
    clInput.dispatchEvent(new Event('input'));
    root(h).querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await settle(h);
    expect(JSON.parse(sessionStorage.getItem('quote:v1:CL')!).values).toEqual({ firstName: 'Luis' });
    expect(JSON.parse(sessionStorage.getItem('quote:v1:CO')!).values).toEqual({ firstName: 'Ana' });
  });

  it('US-01-AC-23 retry resolving not-found shows the not-found page at the same URL (REVIEW-US-01-F02)', async () => {
    let missing = false;
    const h = await boot(() => (missing ? of({ data: [] }) : throwError(() => new Error('down'))));
    await h.navigateByUrl('/cl/datos');
    await settle(h);
    expect(root(h).querySelector('[data-testid=form-error]')).not.toBeNull();

    missing = true;
    retryButton(h).click();
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 10));
      await settle(h);
    }
    expect(TestBed.inject(Router).url).toBe('/cl/datos');
    expect(root(h).querySelector('[data-testid=form-error]')).toBeNull();
    expect(root(h).querySelector('form')).toBeNull();
    expect(root(h).querySelector('a[href="/"]')).not.toBeNull();
  });
});
