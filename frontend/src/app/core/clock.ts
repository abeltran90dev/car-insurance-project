import { InjectionToken } from '@angular/core';

/** Injectable clock so date-dependent validators can be tested with a fixed "today". */
export const CLOCK = new InjectionToken<() => Date>('CLOCK', {
  providedIn: 'root',
  factory: () => () => new Date(),
});
