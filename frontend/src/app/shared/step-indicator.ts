import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { STEPS, Step } from './steps';

@Component({
  selector: 'app-step-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="steps">
      @for (step of steps; track step; let i = $index) {
        <li class="steps__item" [attr.aria-current]="step === current() ? 'step' : null">
          <span class="steps__number">{{ i + 1 }}</span>
        </li>
      }
    </ol>
    <p class="visually-hidden">{{ position() }}</p>
  `,
})
export class StepIndicator {
  readonly current = input<Step | null>(null);
  protected readonly steps = STEPS;
  protected readonly position = computed(() => {
    const index = STEPS.findIndex((s) => s === this.current());
    return index < 0 ? '' : `${index + 1} / ${STEPS.length}`;
  });
}
