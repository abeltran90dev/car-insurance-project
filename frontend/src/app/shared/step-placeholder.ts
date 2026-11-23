import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, input, viewChild } from '@angular/core';
import { CountryContext } from '../core/country-context';

/** Shared placeholder for the step routes; each feature replaces it with its own component. */
@Component({
  selector: 'app-step-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1 #heading tabindex="-1">{{ country()?.name }} · {{ step() }}</h1>
    </section>
  `,
})
export class StepPlaceholder {
  readonly step = input<string>();
  protected readonly country = inject(CountryContext).current;
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  constructor() {
    afterNextRender(() => this.heading().nativeElement.focus());
  }
}
