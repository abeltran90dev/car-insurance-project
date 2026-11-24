import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  untracked,
  viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { forkJoin, map } from 'rxjs';
import { CLOCK } from '../../core/clock';
import { CountryContext } from '../../core/country-context';
import { QuoteStore } from '../../core/quote-store';
import { FALLBACK_COPY } from '../../core/site-copy';
import { ApplicantFormApi } from '../applicant-form/applicant-form-api';
import { Plan } from './plan';
import { PlanListApi } from './plan-list-api';
import { computeFinalPrice } from './pricing';

/** Step 2: plans of the route's country with a simulated price (SPEC-US-02). */
@Component({
  selector: 'app-plan-list',
  templateUrl: './plan-list.html',
  styleUrl: './plan-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanList {
  private readonly api = inject(PlanListApi);
  private readonly formApi = inject(ApplicantFormApi);
  private readonly context = inject(CountryContext);
  private readonly store = inject(QuoteStore);
  private readonly router = inject(Router);
  private readonly clock = inject(CLOCK);
  private readonly injector = inject(Injector);
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');

  protected readonly fallback = FALLBACK_COPY;
  protected readonly country = this.context.current;
  protected readonly selectedId = this.store.planDocumentId;

  /** Plans plus the key of the step 1 field that uses the `vehicleYear` validator (GAP-12). */
  protected readonly resource = rxResource({
    params: () => this.country() ?? undefined,
    stream: ({ params }) =>
      forkJoin({
        plans: this.api.plans(params.code, params.currency),
        yearKey: this.formApi
          .fields(params.code)
          .pipe(map((fields) => fields.find((f) => f.validations.some((v) => v.type === 'vehicleYear'))?.key ?? null)),
      }),
  });

  protected readonly plans = computed<Plan[]>(() => (this.resource.hasValue() ? this.resource.value().plans : []));
  protected readonly recommendedId = computed(() => this.plans().find((p) => p.recommended)?.documentId ?? null);
  protected readonly canContinue = computed(() => {
    const id = this.selectedId();
    return id !== null && this.plans().some((p) => p.documentId === id);
  });

  private readonly vehicleYear = computed<number | null>(() => {
    if (!this.resource.hasValue()) {
      return null;
    }
    const key = this.resource.value().yearKey;
    const value = key ? this.store.values()[key] : null;
    return typeof value === 'number' ? value : null;
  });

  private readonly formatter = computed(() => {
    const c = this.country();
    return c
      ? new Intl.NumberFormat(c.numberLocale, {
          style: 'currency',
          currency: c.currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
      : null;
  });

  private headingFocused = false;

  constructor() {
    // GAP-17: a persisted plan that is no longer offered is cleared silently.
    effect(() => {
      if (this.resource.hasValue() && !this.resource.isLoading()) {
        const id = untracked(() => this.store.planDocumentId());
        if (id !== null && !this.plans().some((p) => p.documentId === id)) {
          untracked(() => this.store.selectPlan(null));
        }
      }
    });
    // GAP-23: focus the heading once content has loaded.
    effect(() => {
      const heading = this.heading();
      if (heading && this.resource.hasValue() && !this.headingFocused) {
        this.headingFocused = true;
        afterNextRender(() => heading.nativeElement.focus(), { injector: this.injector });
      }
    });
  }

  protected text(key: string, fallback: string): string {
    const value = this.country()?.copy[key];
    if (value === undefined) {
      console.warn(`Missing copy key: ${key}`);
      return fallback;
    }
    return value;
  }

  protected price(plan: Plan): string {
    const amount = computeFinalPrice(plan.basePrice, this.vehicleYear(), this.clock());
    return this.formatter()?.format(amount) ?? String(amount);
  }

  protected select(plan: Plan): void {
    this.store.selectPlan(plan.documentId);
  }

  protected retry(): void {
    this.headingFocused = false;
    this.resource.reload();
  }

  protected back(): void {
    this.navigate('datos');
  }

  protected next(): void {
    if (this.canContinue()) {
      this.navigate('resumen');
    }
  }

  private navigate(step: string): void {
    const code = this.country()?.code.toLowerCase();
    if (code) {
      void this.router.navigate(['/', code, step]);
    }
  }
}
