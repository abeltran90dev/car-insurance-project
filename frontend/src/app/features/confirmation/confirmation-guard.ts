import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CountryContext } from '../../core/country-context';
import { ConfirmationStore } from '../summary/confirmation-store';

/** GAP-22: no confirmation in memory for this country redirects to `/{cc}/datos`. */
export const confirmationGuard: CanActivateFn = () => {
  const country = inject(CountryContext).current();
  if (!country) {
    return true;
  }
  const confirmation = inject(ConfirmationStore).current();
  return confirmation?.countryCode === country.code
    ? true
    : inject(Router).createUrlTree(['/', country.code.toLowerCase(), 'datos']);
};
