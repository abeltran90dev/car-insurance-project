import { inject } from '@angular/core';
import { CanActivateFn, GuardResult, Router } from '@angular/router';
import { CountryContext } from '../../core/country-context';
import { QuoteStore } from '../../core/quote-store';
import { plansGuard } from '../plan-list/plans-guard';

/** GAP-05: step 3 needs a valid step 1 (via plansGuard) and a selected plan, else redirect to the first incomplete step. */
export const summaryGuard: CanActivateFn = async (route, state) => {
  const result = (await plansGuard(route, state)) as GuardResult;
  if (result !== true) {
    return result;
  }
  const country = inject(CountryContext).current();
  if (country && inject(QuoteStore).planDocumentId() === null) {
    return inject(Router).createUrlTree(['/', country.code.toLowerCase(), 'planes']);
  }
  return true;
};
