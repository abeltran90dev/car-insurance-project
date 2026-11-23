import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FALLBACK_COPY, SiteCopy } from '../core/site-copy';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1>{{ siteCopy.text('notFound.title', fallback.notFoundTitle) }}</h1>
      <p>{{ siteCopy.text('notFound.message', '') }}</p>
      <a class="button" routerLink="/">{{ siteCopy.text('notFound.backToPicker', fallback.backToHome) }}</a>
    </section>
  `,
})
export class NotFound {
  protected readonly siteCopy = inject(SiteCopy);
  protected readonly fallback = FALLBACK_COPY;
}
