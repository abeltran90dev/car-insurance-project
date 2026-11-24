import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { StrapiClient, StrapiList } from '../../core/strapi-client';
import { FormFieldConfig, FormFieldRaw, toFormFieldConfigs } from './form-field-config';

/** Read-only access to the published form fields of a country (SPEC-US-01 section 4.2). */
@Injectable({ providedIn: 'root' })
export class ApplicantFormApi {
  private readonly client = inject(StrapiClient);

  /** `code` is the upper-case Strapi country code. Published documents only (no status param). */
  fields(code: string): Observable<FormFieldConfig[]> {
    const query =
      `filters[country][code][$eq]=${encodeURIComponent(code)}` +
      '&sort[0]=order:asc&sort[1]=key:asc' +
      '&populate[0]=options&populate[1]=validations' +
      '&pagination[pageSize]=100';
    return this.client
      .get<StrapiList<FormFieldRaw>>(`/form-fields?${query}`)
      .pipe(map((response) => toFormFieldConfigs(response.data)));
  }
}
