import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CLOCK } from '../../core/clock';
import { CountryContext } from '../../core/country-context';
import { QuoteStore } from '../../core/quote-store';
import { ApplicantFormApi } from '../applicant-form/applicant-form-api';
import { isStep1Valid } from '../applicant-form/validators';

/** GAP-05: step 2 needs a valid step 1; otherwise redirect to `/{cc}/datos`. Validated with the form's own engine. */
export const plansGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const country = inject(CountryContext).current();
  const store = inject(QuoteStore);
  const api = inject(ApplicantFormApi);
  const now = inject(CLOCK);
  if (!country) {
    return true; // the step shows its own technical error state
  }
  const redirect = router.createUrlTree(['/', country.code.toLowerCase(), 'datos']);
  const values = store.values();
  if (Object.keys(values).length === 0) {
    return redirect;
  }
  try {
    const fields = await firstValueFrom(api.fields(country.code));
    const genericError = country.copy['form.genericError'] ?? '';
    return isStep1Valid(fields, values, { legalAge: country.legalAge, now, genericError })
      ? true
      : redirect;
  } catch {
    return redirect;
  }
};
