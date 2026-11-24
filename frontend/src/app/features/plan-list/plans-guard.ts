import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CLOCK } from '../../core/clock';
import { CountryContext } from '../../core/country-context';
import { QuoteStore } from '../../core/quote-store';
import { ApplicantFormApi } from '../applicant-form/applicant-form-api';
import { isStep1Valid } from '../applicant-form/validators';

export interface Step1Deps {
  router: Router;
  context: CountryContext;
  store: QuoteStore;
  api: ApplicantFormApi;
  now: () => Date;
}

/** Injects the dependencies of the step-1 check; must run synchronously in the injection context. */
export function injectStep1Deps(): Step1Deps {
  return {
    router: inject(Router),
    context: inject(CountryContext),
    store: inject(QuoteStore),
    api: inject(ApplicantFormApi),
    now: inject(CLOCK),
  };
}

/** Returns `true` when step 1 is valid, otherwise a redirect to `/{cc}/datos`. Plain function: no inject(). */
export async function checkStep1({ router, context, store, api, now }: Step1Deps): Promise<true | UrlTree> {
  const country = context.current();
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
}

/** GAP-05: step 2 needs a valid step 1; otherwise redirect to `/{cc}/datos`. Validated with the form's own engine. */
export const plansGuard: CanActivateFn = () => checkStep1(injectStep1Deps());
