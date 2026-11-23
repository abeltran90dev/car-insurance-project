import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timeout } from 'rxjs';

/** Relative base URL: nginx (Docker) or proxy.conf.json (ng serve) forwards it to Strapi. */
export const API_BASE = '/api';
export const REQUEST_TIMEOUT_MS = 10_000;

export interface StrapiList<T> {
  data: T[];
}

export interface StrapiSingle<T> {
  data: T | null;
}

/**
 * Read-only Strapi client (ADR-003 rules 5 and 7): GET only, no Authorization header,
 * no per-country or per-environment URL. Callers map raw responses to domain models.
 */
@Injectable({ providedIn: 'root' })
export class StrapiClient {
  private readonly http = inject(HttpClient);

  /** `path` starts with '/' and may carry a Strapi query string, e.g. '/countries?sort=name:asc'. */
  get<T>(path: string): Observable<T> {
    return this.http.get<T>(`${API_BASE}${path}`).pipe(timeout(REQUEST_TIMEOUT_MS));
  }
}
