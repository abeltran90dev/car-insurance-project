import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  NavigationStart,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { filter, map } from 'rxjs';
import { CountryContext } from './core/country-context';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="nav-pending" [class.nav-pending--active]="pending()" aria-hidden="true"></div>
    <header class="site-header">
      @if (country(); as c) {
        <a class="site-header__link" routerLink="/">{{ c.name }}</a>
      }
    </header>
    <main class="site-main" [attr.aria-busy]="pending()">
      <router-outlet />
    </main>
  `,
})
export class App {
  private readonly router = inject(Router);
  protected readonly country = inject(CountryContext).current;

  /** True from NavigationStart until the navigation ends, is cancelled or fails. */
  protected readonly pending = toSignal(
    this.router.events.pipe(
      filter(
        (e) =>
          e instanceof NavigationStart ||
          e instanceof NavigationEnd ||
          e instanceof NavigationCancel ||
          e instanceof NavigationError ||
          e instanceof NavigationSkipped,
      ),
      map((e) => e instanceof NavigationStart),
    ),
    { initialValue: false },
  );
}
