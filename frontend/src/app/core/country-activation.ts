import { CountryContext, ResolveOutcome } from './country-context';
import { QuoteStore } from './quote-store';

/**
 * Resolves a country code and, when found, activates its QuoteStore slot. Single place used by the
 * route guard and by the retry path so the two cannot drift apart (AC-13).
 */
export async function resolveAndActivate(
  context: CountryContext,
  store: QuoteStore,
  code: string,
): Promise<ResolveOutcome> {
  const outcome = await context.resolve(code);
  if (outcome === 'found') {
    store.activate(code);
  }
  return outcome;
}
