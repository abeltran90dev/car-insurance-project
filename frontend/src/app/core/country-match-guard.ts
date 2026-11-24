import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { resolveAndActivate } from './country-activation';
import { CountryContext } from './country-context';
import { QuoteStore } from './quote-store';

const COUNTRY_SEGMENT = /^[a-z]{2}$/;
const FIRST_SEGMENT = /^\/[^/?#]+/;

/** ADR-002: validates the first URL segment against Strapi; unknown -> `**` renders in place. */
export const countryMatchGuard: CanMatchFn = async (_route, segments) => {
  const router = inject(Router);
  const context = inject(CountryContext);
  const store = inject(QuoteStore);

  const segment = segments[0]?.path ?? '';
  const lower = segment.toLowerCase();
  if (!COUNTRY_SEGMENT.test(lower)) {
    return false;
  }
  if (segment !== lower) {
    const url = router.currentNavigation()?.extractedUrl.toString() ?? `/${segment}`;
    return router.parseUrl(url.replace(FIRST_SEGMENT, `/${lower}`));
  }
  const code = lower.toUpperCase();
  const outcome = await resolveAndActivate(context, store, code);
  if (outcome === 'found') {
    return true;
  }
  // Strapi unreachable is never reported as "country unknown".
  return outcome === 'error';
};
