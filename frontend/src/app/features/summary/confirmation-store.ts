import { Injectable, signal } from '@angular/core';

export interface Confirmation {
  countryCode: string;
  quoteNumber: string;
  planName: string;
  formattedPrice: string;
}

/** GAP-22: confirmation lives in memory only; never persisted. */
@Injectable({ providedIn: 'root' })
export class ConfirmationStore {
  private readonly value = signal<Confirmation | null>(null);
  readonly current = this.value.asReadonly();

  set(confirmation: Confirmation): void {
    this.value.set(confirmation);
  }

  clear(): void {
    this.value.set(null);
  }
}
