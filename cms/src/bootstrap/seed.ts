import type { Core } from '@strapi/strapi';
import { COUNTRIES, COUNTRY_COPY, SITE_COPY } from './seed-data';

const COUNTRY = 'api::country.country' as const;
const FIELD = 'api::form-field.form-field' as const;
const PLAN = 'api::plan.plan' as const;
const SITE_COPY_UID = 'api::site-copy.site-copy' as const;

/**
 * Idempotent seed. Existence checks use draft-status reads (one row per document),
 * so published documents are never re-created and no published+draft duplicates appear.
 */
export async function seed(strapi: Core.Strapi): Promise<void> {
  const log = strapi.log;

  const siteCopy = await strapi.documents(SITE_COPY_UID).findFirst({});
  if (!siteCopy) {
    await strapi.documents(SITE_COPY_UID).create({ data: { copy: SITE_COPY } as any });
    log.info('[seed] site-copy created');
  }

  for (const c of COUNTRIES) {
    let country = await strapi.documents(COUNTRY).findFirst({ filters: { code: c.code } });
    if (!country) {
      country = await strapi.documents(COUNTRY).create({
        data: {
          code: c.code,
          name: c.name,
          numberLocale: c.numberLocale,
          currency: c.currency,
          legalAge: c.legalAge,
          termsTitle: c.termsTitle,
          termsBody: c.termsBody,
          copy: COUNTRY_COPY,
        } as any,
      });
      log.info(`[seed] country ${c.code} created`);
    }
    const countryId = country.documentId;

    for (const f of c.fields) {
      const found = await strapi.documents(FIELD).findFirst({
        filters: { key: f.key, country: { documentId: countryId } },
      });
      if (found) continue;
      await strapi.documents(FIELD).create({
        data: {
          key: f.key,
          label: f.label,
          type: f.type,
          required: f.required,
          order: f.order,
          group: f.group,
          helpText: f.helpText,
          errorMessage: f.errorMessage,
          placeholder: f.placeholder,
          maskInSummary: f.maskInSummary ?? false,
          options: f.options ?? [],
          validations: f.validations ?? [],
          country: countryId,
        } as any,
        ...(f.draftOnly ? {} : { status: 'published' as const }),
      });
      log.info(`[seed] field ${c.code}/${f.key} created${f.draftOnly ? ' (draft)' : ''}`);
    }

    for (const p of c.plans) {
      const found = await strapi.documents(PLAN).findFirst({
        filters: { name: p.name, country: { documentId: countryId } },
      });
      if (found) continue;
      await strapi.documents(PLAN).create({
        data: {
          name: p.name,
          shortDescription: p.shortDescription,
          basePrice: p.basePrice,
          currency: c.currency,
          order: p.order,
          recommended: p.recommended,
          active: p.active,
          coverages: p.coverages,
          benefits: p.benefits,
          country: countryId,
        } as any,
        ...(p.draftOnly ? {} : { status: 'published' as const }),
      });
      log.info(`[seed] plan ${c.code}/${p.name} created${p.draftOnly ? ' (draft)' : ''}`);
    }
  }
}
