import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { rxResource, takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { startWith, switchMap } from 'rxjs';
import { CLOCK } from '../../core/clock';
import { resolveAndActivate } from '../../core/country-activation';
import { CountryContext } from '../../core/country-context';
import { QuoteStore, QuoteValue } from '../../core/quote-store';
import { FALLBACK_COPY } from '../../core/site-copy';
import { ApplicantFormApi } from './applicant-form-api';
import { FormFieldConfig } from './form-field-config';
import {
  FieldValue,
  RULE_ERROR,
  ValidationContext,
  ValidationFailure,
  buildValidators,
  normalizeValue,
  toStoredValue,
} from './validators';

type FieldControl = FormControl<FieldValue>;
type ApplicantGroup = FormGroup<Record<string, FieldControl>>;

interface BuiltForm {
  fields: FormFieldConfig[];
  group: ApplicantGroup;
}

/** Step 1: the form is generated at runtime from the Strapi configuration of the current country. */
@Component({
  selector: 'app-applicant-form',
  imports: [ReactiveFormsModule],
  templateUrl: './applicant-form.html',
  styleUrl: './applicant-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicantForm {
  private readonly api = inject(ApplicantFormApi);
  private readonly context = inject(CountryContext);
  private readonly store = inject(QuoteStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly clock = inject(CLOCK);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');

  protected readonly fallback = FALLBACK_COPY;
  protected readonly country = this.context.current;
  protected readonly submitted = signal(false);
  /** Bumped on every control event so OnPush templates re-read control state. */
  private readonly revision = signal(0);
  private headingFocused = false;

  protected readonly fieldsResource = rxResource({
    params: () => this.country()?.code,
    stream: ({ params }) => this.api.fields(params),
  });

  private readonly built = computed<BuiltForm | null>(() => {
    const country = this.country();
    if (!country || !this.fieldsResource.hasValue()) {
      return null;
    }
    const fields = this.fieldsResource.value();
    let genericError = country.copy['form.genericError'];
    if (!genericError) {
      console.warn('Missing copy key: form.genericError');
      genericError = FALLBACK_COPY.error;
    }
    const ctx: ValidationContext = {
      legalAge: typeof country.legalAge === 'number' ? country.legalAge : null,
      now: this.clock,
      genericError,
    };
    const stored = untracked(() => this.store.values());
    const controls: Record<string, FieldControl> = {};
    for (const field of fields) {
      controls[field.key] = new FormControl<FieldValue>(initialValue(field, stored[field.key]), {
        validators: buildValidators(field, ctx),
      });
    }
    return { fields, group: new FormGroup(controls) };
  });

  protected readonly fields = computed(() => this.built()?.fields ?? []);
  protected readonly form = computed(() => this.built()?.group ?? null);

  constructor() {
    toObservable(this.form)
      .pipe(
        switchMap((group) => (group ? group.events.pipe(startWith(null)) : [])),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.revision.update((v) => v + 1));

    afterNextRender(() => this.focusHeading());
  }

  protected text(key: string, fallback: string): string {
    const value = this.country()?.copy[key];
    if (value === undefined) {
      console.warn(`Missing copy key: ${key}`);
      return fallback;
    }
    return value;
  }

  protected controlFor(key: string): FieldControl {
    // Only called for keys rendered from this form's own field list.
    return this.form()!.controls[key];
  }

  /** The visible error for a field: shown after blur (touched) or after "Continuar". */
  protected errorFor(key: string): string | null {
    if (!this.isInvalidShown(key)) {
      return null;
    }
    const failure = this.form()!.controls[key].errors?.[RULE_ERROR] as ValidationFailure | undefined;
    return failure?.message || FALLBACK_COPY.error;
  }

  /** Whether the field is invalid and its error is due (touched or submitted); independent of message text. */
  protected isInvalidShown(key: string): boolean {
    this.revision();
    const control = this.form()?.controls[key];
    return !!control && control.invalid && (control.touched || this.submitted());
  }

  protected describedBy(field: FormFieldConfig): string | null {
    const ids: string[] = [];
    if (field.helpText) {
      ids.push(`${this.id(field)}-help`);
    }
    if (this.isInvalidShown(field.key)) {
      ids.push(`${this.id(field)}-error`);
    }
    return ids.length > 0 ? ids.join(' ') : null;
  }

  protected id(field: FormFieldConfig): string {
    return `field-${field.key}`;
  }

  protected retry(): void {
    if (this.country()) {
      this.fieldsResource.reload();
      return;
    }
    const code = this.route.parent?.snapshot.paramMap.get('country')?.toUpperCase();
    if (code) {
      void this.resolveAfterError(code);
    }
  }

  private async resolveAfterError(code: string): Promise<void> {
    const outcome = await resolveAndActivate(this.context, this.store, code);
    if (outcome === 'not-found') {
      // Re-run canMatch so the route falls through to `**` (not-found page) at the same URL.
      await this.router.navigateByUrl(this.router.url, { onSameUrlNavigation: 'reload' });
    }
  }

  protected submit(): void {
    const form = this.form();
    const country = this.country();
    if (!form || !country) {
      return;
    }
    this.submitted.set(true);
    form.markAllAsTouched();
    this.revision.update((v) => v + 1);
    if (form.invalid) {
      const firstInvalid = this.fields().find((f) => form.controls[f.key].invalid);
      if (firstInvalid) {
        const id = this.id(firstInvalid);
        Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('[id]')).find((el) => el.id === id)?.focus();
      }
      return;
    }
    const values: Record<string, QuoteValue> = {};
    for (const field of this.fields()) {
      values[field.key] = toStoredValue(field, form.controls[field.key].value);
    }
    this.store.setApplicant(values);
    void this.router.navigate(['/', country.code.toLowerCase(), 'planes']);
  }

  private focusHeading(): void {
    const heading = this.heading();
    if (heading && !this.headingFocused) {
      this.headingFocused = true;
      heading.nativeElement.focus();
    }
  }
}

/** Restores a stored value only when it still matches the field's type (GAP-10: removed fields are dropped). */
function initialValue(field: FormFieldConfig, stored: QuoteValue | undefined): FieldValue {
  if (stored === undefined) {
    return emptyValue(field);
  }
  const normalized = normalizeValue(field, stored);
  if (field.type === 'select' && !field.options.some((o) => o.value === normalized)) {
    return emptyValue(field);
  }
  return normalized;
}

function emptyValue(field: FormFieldConfig): FieldValue {
  return field.type === 'checkbox' ? false : field.type === 'number' ? null : '';
}
