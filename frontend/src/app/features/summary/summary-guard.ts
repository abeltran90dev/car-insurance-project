import { CanActivateFn } from '@angular/router';
import { checkStep1, injectStep1Deps } from '../plan-list/plans-guard';

/** GAP-05: step 3 needs a valid step 1 and a selected plan, else redirect to the first incomplete step. */
export const summaryGuard: CanActivateFn = async () => {
  const deps = injectStep1Deps(); // all inject() calls happen before the first await
  const result = await checkStep1(deps);
  if (result !== true) {
    return result;
  }
  const country = deps.context.current();
  if (country && deps.store.planDocumentId() === null) {
    return deps.router.createUrlTree(['/', country.code.toLowerCase(), 'planes']);
  }
  return true;
};
