import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CopyEntryRaw, toCopyRecord } from './country-config';
import { StrapiClient, StrapiSingle } from './strapi-client';

/** Minimal technical Spanish fallback, used only when Strapi is unreachable (ADR-001). */
export const FALLBACK_COPY = {
  loading: 'Cargando…',
  error: 'No pudimos cargar el contenido.',
  retry: 'Reintentar',
  notFoundTitle: 'Página no encontrada',
  backToHome: 'Volver al inicio',
} as const;

/** Country-independent copy (`site-copy` single type): picker and not-found page. */
@Injectable({ providedIn: 'root' })
export class SiteCopy {
  private readonly client = inject(StrapiClient);

  readonly resource = rxResource({
    stream: () => this.client.get<StrapiSingle<{ copy?: CopyEntryRaw[] | null }>>('/site-copy?populate[0]=copy'),
  });

  /** Empty record until loaded or when Strapi is unreachable. */
  readonly copy = computed<Record<string, string>>(() =>
    this.resource.hasValue() ? toCopyRecord(this.resource.value().data?.copy) : {},
  );

  /** Looks up a key; falls back silently (the error state already tells the story) when unavailable. */
  text(key: string, fallback: string): string {
    if (this.resource.error()) {
      return fallback;
    }
    const value = this.copy()[key];
    if (value === undefined) {
      if (this.resource.hasValue()) {
        console.warn(`Missing copy key: ${key}`);
      }
      return fallback;
    }
    return value;
  }
}
