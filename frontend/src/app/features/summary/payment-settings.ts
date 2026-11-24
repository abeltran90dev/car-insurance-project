import { InjectionToken } from '@angular/core';

/** Simulated gateway processing time (SPEC-US-03 testability note); overridable in unit tests. */
export const PAYMENT_DELAY_MS = new InjectionToken<number>('PAYMENT_DELAY_MS', {
  providedIn: 'root',
  factory: () => 1500,
});
