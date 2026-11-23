import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { StepIndicator } from './step-indicator';
import { Step, isStep } from './steps';

/** Layout of every `:country` route: step indicator above the active step. */
@Component({
  selector: 'app-country-shell',
  imports: [RouterOutlet, StepIndicator],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-step-indicator [current]="step()" />
    <router-outlet />
  `,
})
export class CountryShell {
  private readonly router = inject(Router);

  protected readonly step = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map((): Step | null => {
        const segment = this.router.url.split(/[?#]/)[0].split('/')[2];
        return isStep(segment) ? segment : null;
      }),
    ),
    { initialValue: null },
  );
}
