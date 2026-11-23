import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CountryRaw } from '../core/country-config';
import { FALLBACK_COPY, SiteCopy } from '../core/site-copy';
import { StrapiClient, StrapiList } from '../core/strapi-client';

@Component({
  selector: 'app-country-picker',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1>{{ siteCopy.text('picker.title', '') }}</h1>
      <p>{{ siteCopy.text('picker.intro', '') }}</p>
      @if (countries.isLoading()) {
        <p role="status">{{ siteCopy.text('picker.loading', fallback.loading) }}</p>
      } @else if (countries.error()) {
        <p role="alert">{{ siteCopy.text('picker.error', fallback.error) }}</p>
        <button type="button" class="button" (click)="reload()">
          {{ siteCopy.text('common.retry', fallback.retry) }}
        </button>
      } @else if (links().length > 0) {
        <ul class="country-list">
          @for (country of links(); track country.code) {
            <li><a class="button" [routerLink]="['/', country.segment]">{{ country.name }}</a></li>
          }
        </ul>
      }
    </section>
  `,
})
export class CountryPicker {
  private readonly client = inject(StrapiClient);
  protected readonly siteCopy = inject(SiteCopy);
  protected readonly fallback = FALLBACK_COPY;

  protected readonly countries = rxResource({
    stream: () => this.client.get<StrapiList<CountryRaw>>('/countries?sort=name:asc&pagination[pageSize]=100'),
  });

  protected readonly links = computed(() =>
    this.countries.hasValue()
      ? this.countries.value().data.map((c) => ({ code: c.code, name: c.name, segment: c.code.toLowerCase() }))
      : [],
  );

  protected reload(): void {
    this.countries.reload();
    this.siteCopy.resource.reload();
  }
}
