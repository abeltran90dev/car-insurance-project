import { Injectable, computed, effect, signal } from '@angular/core';

export type QuoteValue = string | number | boolean | null;

/** ADR-004: the only shape ever written to sessionStorage. */
export interface StoredQuote {
  v: 1;
  country: string;
  values: Record<string, QuoteValue>;
  planDocumentId: string | null;
}

interface QuoteState {
  country: string;
  values: Record<string, QuoteValue>;
  planDocumentId: string | null;
}

const STORAGE_VERSION = 1;

export function quoteStorageKey(code: string): string {
  return `quote:v${STORAGE_VERSION}:${code}`;
}

/**
 * Wizard state, one entry per country (ADR-004). The only place that touches sessionStorage.
 * Prices, config, terms acceptance, payment and confirmation are never stored.
 */
@Injectable({ providedIn: 'root' })
export class QuoteStore {
  private readonly state = signal<QuoteState | null>(null);
  private storageWarned = false;

  readonly country = computed(() => this.state()?.country ?? null);
  readonly values = computed(() => this.state()?.values ?? {});
  readonly planDocumentId = computed(() => this.state()?.planDocumentId ?? null);

  constructor() {
    effect(() => this.persist(this.state()));
  }

  /** Switches to a country's slot, rehydrating it from sessionStorage (or empty). */
  activate(code: string): void {
    if (this.state()?.country === code) {
      return;
    }
    this.state.set(this.read(code) ?? { country: code, values: {}, planDocumentId: null });
  }

  setApplicant(values: Record<string, QuoteValue>): void {
    this.update((s) => ({ ...s, values }));
  }

  selectPlan(planDocumentId: string | null): void {
    this.update((s) => ({ ...s, planDocumentId }));
  }

  /** Removes the current country's entry (after an approved payment). */
  clear(): void {
    const current = this.state();
    if (current) {
      this.state.set({ country: current.country, values: {}, planDocumentId: null });
    }
  }

  private update(change: (state: QuoteState) => QuoteState): void {
    const current = this.state();
    if (current) {
      this.state.set(change(current));
    }
  }

  private persist(state: QuoteState | null): void {
    if (!state) {
      return;
    }
    const key = quoteStorageKey(state.country);
    try {
      if (Object.keys(state.values).length === 0 && state.planDocumentId === null) {
        sessionStorage.removeItem(key);
        return;
      }
      const stored: StoredQuote = {
        v: STORAGE_VERSION,
        country: state.country,
        values: state.values,
        planDocumentId: state.planDocumentId,
      };
      sessionStorage.setItem(key, JSON.stringify(stored));
    } catch {
      this.warnStorage();
    }
  }

  private read(code: string): QuoteState | null {
    const key = quoteStorageKey(code);
    try {
      const raw = sessionStorage.getItem(key);
      if (raw === null) {
        return null;
      }
      const parsed: unknown = JSON.parse(raw);
      if (isStoredQuote(parsed, code)) {
        return { country: code, values: parsed.values, planDocumentId: parsed.planDocumentId };
      }
      sessionStorage.removeItem(key);
    } catch {
      this.warnStorage();
    }
    return null;
  }

  private warnStorage(): void {
    if (!this.storageWarned) {
      this.storageWarned = true;
      console.warn('sessionStorage unavailable or invalid; wizard state is kept in memory only.');
    }
  }
}

function isStoredQuote(value: unknown, code: string): value is StoredQuote {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    candidate['v'] === STORAGE_VERSION &&
    candidate['country'] === code &&
    typeof candidate['values'] === 'object' &&
    candidate['values'] !== null &&
    !Array.isArray(candidate['values']) &&
    (candidate['planDocumentId'] === null || typeof candidate['planDocumentId'] === 'string')
  );
}
