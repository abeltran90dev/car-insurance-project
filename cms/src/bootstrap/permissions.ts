import type { Core } from '@strapi/strapi';

// ADR-003: explicit allow-list. `find` only. No findOne, no writes. No patterns, no loops over content types.
export const PUBLIC_READ_ALLOW_LIST = [
  'api::country.country.find',
  'api::form-field.form-field.find',
  'api::plan.plan.find',
  'api::site-copy.site-copy.find',
] as const;

const ROLE_UID = 'plugin::users-permissions.role';
const PERMISSION_UID = 'plugin::users-permissions.permission';

/**
 * Grants the Public role the allow-listed read permissions. Idempotent and grant-only:
 * it never revokes; unexpected `api::*` permissions on Public only produce a warning.
 * Uses internal (undocumented) Users & Permissions models; keep all such usage in this file.
 */
export async function grantPublicReadPermissions(strapi: Core.Strapi): Promise<void> {
  const role = await strapi.db.query(ROLE_UID).findOne({ where: { type: 'public' } });
  if (!role) {
    strapi.log.error('[permissions] Public role not found; no permissions granted');
    return;
  }

  const existing: Array<{ action: string }> = await strapi.db
    .query(PERMISSION_UID)
    .findMany({ where: { role: role.id } });
  const existingActions = new Set(existing.map((p) => p.action));

  for (const action of PUBLIC_READ_ALLOW_LIST) {
    if (existingActions.has(action)) continue;
    await strapi.db.query(PERMISSION_UID).create({ data: { action, role: role.id } });
    strapi.log.info(`[permissions] Granted public: ${action}`);
  }

  const allowed = new Set<string>(PUBLIC_READ_ALLOW_LIST);
  for (const action of existingActions) {
    if (action.startsWith('api::') && !allowed.has(action)) {
      strapi.log.warn(`[permissions] Unexpected public permission outside allow-list (not revoked): ${action}`);
    }
  }
}
