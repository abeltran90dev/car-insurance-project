import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { StrapiClient, StrapiList } from '../../core/strapi-client';
import { Plan, PlanRaw, toPlans } from './plan';

/** Read-only access to the published, active plans of a country (SPEC-US-02 section 4.2). */
@Injectable({ providedIn: 'root' })
export class PlanListApi {
  private readonly client = inject(StrapiClient);

  /** `code` is the upper-case country code; `currency` the country's currency. No status param, no auth. */
  plans(code: string, currency: string): Observable<Plan[]> {
    const query =
      `filters[country][code][$eq]=${encodeURIComponent(code)}` +
      '&filters[active][$eq]=true' +
      '&sort[0]=order:asc&sort[1]=name:asc' +
      '&populate[0]=coverages&populate[1]=benefits' +
      '&pagination[pageSize]=100';
    return this.client
      .get<StrapiList<PlanRaw>>(`/plans?${query}`)
      .pipe(map((response) => toPlans(response.data, currency)));
  }
}
