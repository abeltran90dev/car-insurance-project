import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CLOCK } from '../../core/clock';
import { resolveAndActivate } from '../../core/country-activation';
import { CountryContext } from '../../core/country-context';
import { QuoteStore } from '../../core/quote-store';
import { FALLBACK_COPY } from '../../core/site-copy';
import { ApplicantFormApi } from '../applicant-form/applicant-form-api';
import { PlanListApi } from '../plan-list/plan-list-api';
import { computeFinalPrice } from '../plan-list/pricing';
import { ConfirmationStore } from './confirmation-store';
import { PAYMENT_DELAY_MS } from './payment-settings';
import { generateQuoteNumber } from './quote-number';
import { buildRows } from './summary-model';

export type PaymentState = 'idle' | 'gateway' | 'processing' | 'rejected' | 'approved';

/** Step 3: summary, terms and simulated payment (SPEC-US-03). */
@Component({
  selector: 'app-summary',
  templateUrl: './summary.html',
  styleUrl: './summary.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Summary {
  private readonly formApi = inject(ApplicantFormApi);
  private readonly planApi = inject(PlanListApi);
  private readonly context = inject(CountryContext);
  private readonly store = inject(QuoteStore);
  private readonly confirmations = inject(ConfirmationStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly clock = inject(CLOCK);
  private readonly delayMs = inject(PAYMENT_DELAY_MS);
  private readonly injector = inject(Injector);
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private readonly gatewayHeading = viewChild<ElementRef<HTMLElement>>('gatewayHeading');
  private readonly alert = viewChild<ElementRef<HTMLElement>>('alert');
  private readonly payButton = viewChild<ElementRef<HTMLElement>>('payButton');

  protected readonly fallback = FALLBACK_COPY;
  protected readonly country = this.context.current;
  protected readonly state = signal<PaymentState>('idle');
  /** GAP-18: memory only; a new component instance (every visit) starts unchecked. */
  protected readonly accepted = signal(false);

  /** Fields and plans are fetched on every entry (GAP-15); nothing is cached here. */
  protected readonly resource = rxResource({
    params: () => this.country() ?? undefined,
    stream: ({ params }) =>
      forkJoin({
        fields: this.formApi.fields(params.code),
        plans: this.planApi.plans(params.code, params.currency),
      }),
  });

  private readonly data = computed(() => (this.resource.hasValue() ? this.resource.value() : null));

  private readonly selectedPlan = computed(() => {
    const id = this.store.planDocumentId();
    return this.data()?.plans.find((p) => p.documentId === id) ?? null;
  });

  protected readonly planUnavailable = computed(
    () => this.data() !== null && this.selectedPlan() === null && this.state() !== 'approved',
  );

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

  protected readonly view = computed(() => {
    const data = this.data();
    const country = this.country();
    const plan = this.selectedPlan();
    if (!data || !country || !plan) {
      return null;
    }
    const yearKey = data.fields.find((f) => f.validations.some((v) => v.type === 'vehicleYear'))?.key;
    const year = yearKey ? this.store.values()[yearKey] : null;
    const finalPrice = computeFinalPrice(plan.basePrice, typeof year === 'number' ? year : null, this.clock());
    const format = {
      numberLocale: country.numberLocale,
      yes: this.text('common.yes', ''),
      no: this.text('common.no', ''),
    };
    const values = this.store.values();
    return {
      policyholder: buildRows(data.fields, values, 'policyholder', format),
      vehicle: buildRows(data.fields, values, 'vehicle', format),
      plan,
      formattedPrice: this.formatter()?.format(finalPrice) ?? String(finalPrice),
    };
  });

  protected readonly termsAvailable = computed(() => (this.country()?.termsBody ?? '').trim().length > 0);

  protected readonly locked = computed(() => this.state() === 'processing');
  protected readonly canPay = computed(
    () =>
      this.accepted() &&
      this.termsAvailable() &&
      (this.state() === 'idle' || this.state() === 'rejected') &&
      this.view() !== null,
  );

  private timer: ReturnType<typeof setTimeout> | null = null;
  private headingFocused = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelTimer());
    effect(() => {
      const heading = this.heading();
      if (heading && this.data() && !this.headingFocused) {
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

  protected setAccepted(event: Event): void {
    if (this.locked()) {
      return;
    }
    const checked = (event.target as HTMLInputElement).checked;
    this.accepted.set(checked);
    if (!checked && this.state() === 'gateway') {
      // Pagar is disabled now; focus stays on the terms checkbox the user just operated.
      this.state.set('idle');
    }
  }

  protected openGateway(): void {
    if (!this.canPay()) {
      return;
    }
    this.state.set('gateway');
    this.focusLater(this.gatewayHeading);
  }

  protected cancel(): void {
    if (this.state() !== 'gateway') {
      return;
    }
    this.state.set('idle');
    this.focusLater(this.payButton);
  }

  /** SPEC-US-03 section 5 "Single submit": only accepted from `gateway`. */
  protected simulate(outcome: 'approved' | 'rejected'): void {
    if (this.state() !== 'gateway' || !this.accepted() || !this.termsAvailable()) {
      return;
    }
    this.state.set('processing');
    this.timer = setTimeout(() => {
      this.timer = null;
      if (outcome === 'approved') {
        void this.approve();
      } else {
        this.state.set('rejected');
        this.focusLater(this.alert);
      }
    }, this.delayMs);
  }

  private async approve(): Promise<void> {
    const country = this.country();
    const view = this.view();
    if (!country || !view) {
      this.state.set('idle');
      return;
    }
    this.state.set('approved');
    this.confirmations.set({
      countryCode: country.code,
      quoteNumber: generateQuoteNumber(country.code, this.clock()),
      planName: view.plan.name,
      formattedPrice: view.formattedPrice,
    });
    const code = country.code.toLowerCase();
    // ADR-004: clear the quote before navigating; state `approved` keeps the "plan unavailable" view hidden.
    this.store.clear();
    const navigated = await this.router.navigate(['/', code, 'confirmacion']);
    if (!navigated) {
      this.confirmations.clear();
      await this.router.navigate(['/', code, 'datos']);
    }
  }

  protected editData(): void {
    this.go('datos');
  }

  protected changePlan(): void {
    this.go('planes');
  }

  private go(step: string): void {
    const code = this.country()?.code.toLowerCase();
    if (code && !this.locked()) {
      void this.router.navigate(['/', code, step]);
    }
  }

  private cancelTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private focusLater(target: () => ElementRef<HTMLElement> | undefined): void {
    afterNextRender(() => target()?.nativeElement.focus(), { injector: this.injector });
  }

  protected retry(): void {
    this.headingFocused = false;
    if (this.country()) {
      this.resource.reload();
      return;
    }
    const code = this.route.parent?.snapshot.paramMap.get('country')?.toUpperCase();
    if (code) {
      void this.resolveAfterError(code);
    }
  }

  private async resolveAfterError(code: string): Promise<void> {
    const outcome = await resolveAndActivate(this.context, this.store, code);
    if (outcome !== 'error') {
      await this.router.navigateByUrl(this.router.url, { onSameUrlNavigation: 'reload' });
    }
  }
}
