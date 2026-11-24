import type { Core } from '@strapi/strapi';
import { grantPublicReadPermissions } from './bootstrap/permissions';
import { seed } from './bootstrap/seed';

export default {
  register() {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await grantPublicReadPermissions(strapi);
    if (process.env.SEED_ON_BOOT === 'true') {
      await seed(strapi);
    }
  },
};
