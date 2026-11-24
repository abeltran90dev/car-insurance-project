import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CountryConfig, CountryRaw, toCountryConfig } from './country-config';
import { StrapiClient, StrapiList } from './strapi-client';

export type ResolveOutcome = 'found' | 'not-found' | 'error';

/** Holds the country of the current route (ADR-002). Lookups are cached in memory. */
@Injectable({ providedIn: 'root' })
export class CountryContext {
  private readonly client = inject(StrapiClient);
  private readonly cache = new Map<string, CountryConfig>();
  private readonly config = signal<CountryConfig | null>(null);

  readonly current = this.config.asReadonly();

  /** `code` is the upper-case Strapi code. Never throws: failures are reported as 'error'. */
  async resolve(code: string): Promise<ResolveOutcome> {
    const cached = this.cache.get(code);
    if (cached) {
      this.config.set(cached);
      return 'found';
    }
    try {
      const response = await firstValueFrom(
        this.client.get<StrapiList<CountryRaw>>(
          `/countries?filters[code][$eq]=${encodeURIComponent(code)}&populate[0]=copy`,
        ),
      );
      const entry = response.data[0];
      if (!entry) {
        this.config.set(null);
        return 'not-found';
      }
      const mapped = toCountryConfig(entry);
      this.cache.set(code, mapped);
      this.config.set(mapped);
      return 'found';
    } catch {
      this.config.set(null);
      return 'error';
    }
  }
}
