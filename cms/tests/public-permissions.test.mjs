// Scaffold test (ADR-003): public reads work, public writes are denied (401 or 403).
// Run against a running Strapi: STRAPI_URL=http://localhost:1337 npm run test:permissions
import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.STRAPI_URL || 'http://localhost:1337';
const DENIED = [401, 403];
const JSON_HEADERS = { 'content-type': 'application/json' };

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, body: await res.json().catch(() => null) };
}
async function send(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: JSON_HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.status;
}

const COUNTRIES = ['CO', 'CL'];
const TYPES = [
  { plural: 'countries', list: (cc) => `/api/countries?filters[code][$eq]=${cc}&pagination[pageSize]=100` },
  { plural: 'form-fields', list: (cc) => `/api/form-fields?filters[country][code][$eq]=${cc}&pagination[pageSize]=100` },
  { plural: 'plans', list: (cc) => `/api/plans?filters[country][code][$eq]=${cc}&pagination[pageSize]=100` },
];

for (const t of TYPES) {
  for (const cc of COUNTRIES) {
    test(`scaffold: GET /api/${t.plural} returns seeded ${cc} data`, async () => {
      const { status, body } = await get(t.list(cc));
      assert.equal(status, 200);
      assert.ok(Array.isArray(body.data) && body.data.length > 0, `no ${t.plural} for ${cc}`);
    });
  }

  test(`scaffold: public POST, PUT and DELETE on /api/${t.plural} are denied`, async () => {
    const { body } = await get(t.list('CO'));
    const documentId = body.data[0].documentId;
    assert.ok(documentId, 'seeded documentId missing');
    const results = {
      post: await send('POST', `/api/${t.plural}`, { data: { name: 'x' } }),
      put: await send('PUT', `/api/${t.plural}/${documentId}`, { data: { name: 'x' } }),
      delete: await send('DELETE', `/api/${t.plural}/${documentId}`),
    };
    for (const [m, s] of Object.entries(results)) {
      assert.ok(DENIED.includes(s), `${m} /api/${t.plural} returned ${s}`);
    }
    console.log(`# ${t.plural} write statuses:`, JSON.stringify(results));
  });
}

test('scaffold: site-copy GET returns 200 with copy entries', async () => {
  const { status, body } = await get('/api/site-copy?populate[0]=copy');
  assert.equal(status, 200);
  assert.ok(body.data.copy.length > 0);
});

test('scaffold: public PUT and DELETE on /api/site-copy are denied', async () => {
  const put = await send('PUT', '/api/site-copy', { data: { copy: [] } });
  const del = await send('DELETE', '/api/site-copy');
  assert.ok(DENIED.includes(put), `PUT returned ${put}`);
  assert.ok(DENIED.includes(del), `DELETE returned ${del}`);
  console.log(`# site-copy write statuses: put=${put} delete=${del}`);
});

test('scaffold: findOne is not granted on the Public role', async () => {
  const { body } = await get('/api/plans?pagination[pageSize]=1');
  const { status } = await get(`/api/plans/${body.data[0].documentId}`);
  assert.ok(DENIED.includes(status), `findOne returned ${status}`);
});

for (const cc of COUNTRIES) {
  test(`scaffold: draft form field is not returned for ${cc}`, async () => {
    const { body } = await get(`/api/form-fields?filters[country][code][$eq]=${cc}&pagination[pageSize]=100`);
    assert.ok(body.data.length > 0);
    assert.ok(!body.data.some((f) => f.key === 'draftOnlyField'), 'draft field leaked');
  });

  test(`scaffold: inactive and draft plans are not returned for ${cc} by the app query`, async () => {
    const { body } = await get(
      `/api/plans?filters[country][code][$eq]=${cc}&filters[active][$eq]=true&sort[0]=order:asc&sort[1]=name:asc&pagination[pageSize]=100`,
    );
    const names = body.data.map((p) => p.name);
    assert.equal(body.data.length, 3, `expected 3 active published plans, got ${names.join(', ')}`);
    assert.ok(!names.includes('Plan Antiguo'), 'inactive plan leaked');
    assert.ok(!names.includes('Plan Borrador'), 'draft plan leaked');
    assert.equal(body.data.filter((p) => p.recommended).length, 1);
  });
}
