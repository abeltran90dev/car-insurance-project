import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CLOCK } from '../../core/clock';
import { CountryRaw } from '../../core/country-config';
import { CountryContext } from '../../core/country-context';
import { QuoteStore } from '../../core/quote-store';
import { StrapiClient } from '../../core/strapi-client';
import { ApplicantForm } from './applicant-form';
import { FormFieldRaw } from './form-field-config';

const COPY = [
  { key: 'form.title', value: 'TITLE' },
  { key: 'form.genericError', value: 'GENERIC-MSG' },
  { key: 'common.continue', value: 'CONTINUE' },
];

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

async function setup(fields: FormFieldRaw[], copy: CountryRaw['copy']) {
  const get = vi.fn((path: string) => {
    if (path.startsWith('/countries')) {
      return of({
        data: [{ code: 'CO', name: 'CO', numberLocale: 'es-CO', currency: 'COP', legalAge: 18, copy }],
      });
    }
    if (path.startsWith('/form-fields')) {
      return of({ data: fields });
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
  await TestBed.inject(CountryContext).resolve('CO');
  TestBed.inject(QuoteStore).activate('CO');
  vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture: ComponentFixture<ApplicantForm> = TestBed.createComponent(ApplicantForm);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

async function submit(s: { fixture: ComponentFixture<ApplicantForm>; el: HTMLElement }): Promise<void> {
  s.el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
  s.fixture.detectChanges();
  await s.fixture.whenStable();
  s.fixture.detectChanges();
}

const input = (el: HTMLElement, key: string): HTMLInputElement => el.querySelector<HTMLInputElement>(`#field-${key}`)!;

describe('ApplicantForm fix-round regressions', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('US-01-AC-19 never renders an empty error and keeps aria in sync without genericError (REVIEW-US-01-F03)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const s = await setup([raw({ key: 'firstName' })], COPY.filter((c) => c.key !== 'form.genericError'));
    await submit(s);
    const error = s.el.querySelector('#field-firstName-error');
    expect(error).not.toBeNull();
    expect(error!.textContent?.trim().length).toBeGreaterThan(0);
    const control = input(s.el, 'firstName');
    expect(control.getAttribute('aria-invalid')).toBe('true');
    expect(control.getAttribute('aria-describedby')?.split(' ')).toContain('field-firstName-error');
  });

  it('US-01-AC-02 field without any message still shows a non-empty error with aria (REVIEW-US-01-F03)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const s = await setup(
      [raw({ key: 'firstName', errorMessage: null })],
      COPY.filter((c) => c.key !== 'form.genericError'),
    );
    input(s.el, 'firstName').dispatchEvent(new Event('blur'));
    s.fixture.detectChanges();
    expect(s.el.querySelector('#field-firstName-error')?.textContent?.trim()).toBeTruthy();
    expect(input(s.el, 'firstName').getAttribute('aria-invalid')).toBe('true');
    expect(input(s.el, 'firstName').getAttribute('aria-describedby')).toContain('field-firstName-error');
  });

  it('US-01-AC-11 focuses the first invalid field only once aria-invalid and its error exist (REVIEW-US-01-F04)', async () => {
    const s = await setup(
      [raw({ key: 'aaa', order: 1, errorMessage: 'AAA-MSG' }), raw({ key: 'bbb', order: 2, errorMessage: 'BBB-MSG' })],
      COPY,
    );
    document.body.appendChild(s.el);
    const snapshots: Array<{ id: string; invalid: string | null; hasError: boolean }> = [];
    const original = HTMLElement.prototype.focus;
    vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement) {
      if (this.id.startsWith('field-')) {
        snapshots.push({
          id: this.id,
          invalid: this.getAttribute('aria-invalid'),
          hasError: s.el.querySelector(`#${this.id}-error`) !== null,
        });
      }
      original.call(this);
    });
    await submit(s);
    expect(document.activeElement).toBe(input(s.el, 'aaa'));
    expect(snapshots[0]).toEqual({ id: 'field-aaa', invalid: 'true', hasError: true });
    s.el.remove();
  });
});
