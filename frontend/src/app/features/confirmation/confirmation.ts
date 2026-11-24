import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CountryContext } from '../../core/country-context';
import { ConfirmationStore } from '../summary/confirmation-store';

/** Confirmation after an approved simulated payment (SPEC-US-03); data is memory only (GAP-22). */
@Component({
  selector: 'app-confirmation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page confirmation">
      @if (confirmation(); as c) {
        <h1 #heading tabindex="-1">{{ text('confirmation.title') }}</h1>
        <dl>
          <dt>{{ text('confirmation.quoteNumberLabel') }}</dt>
          <dd data-testid="quote-number">{{ c.quoteNumber }}</dd>
          <dt>{{ text('summary.planTitle') }}</dt>
          <dd data-testid="confirmation-plan">{{ c.planName }}</dd>
          <dt>{{ text('summary.priceLabel') }}</dt>
          <dd data-testid="confirmation-price">{{ c.formattedPrice }}</dd>
        </dl>
        <button type="button" class="button" (click)="newQuote()">{{ text('confirmation.newQuote') }}</button>
      }
    </section>
  `,
})
export class Confirmation {
  private readonly country = inject(CountryContext).current;
  private readonly confirmations = inject(ConfirmationStore);
  private readonly router = inject(Router);
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');

  protected readonly confirmation = this.confirmations.current;

  constructor() {
    afterNextRender(() => this.heading()?.nativeElement.focus());
  }

  protected text(key: string): string {
    const value = this.country()?.copy[key];
    if (value === undefined) {
      console.warn(`Missing copy key: ${key}`);
      return '';
    }
    return value;
  }

  protected newQuote(): void {
    const code = this.country()?.code.toLowerCase();
    this.confirmations.clear();
    if (code) {
      void this.router.navigate(['/', code, 'datos']);
    }
  }
}
