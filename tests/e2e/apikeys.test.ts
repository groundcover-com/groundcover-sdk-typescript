import { describe, expect, it } from 'vitest';
import {
  createApiKey,
  createPolicy,
  createServiceAccount,
  deleteApiKey,
  deletePolicy,
  deleteServiceAccount,
  listApiKeys,
} from '../../src/index.js';
import { type TestClient, newTestClient } from './setup.js';

async function createTestPolicy(tc: TestClient, ts: number) {
  const policyName = `sdk-ts-e2e-test-policy-for-apikey-${ts}`;
  const policyRes = await createPolicy({
    client: tc.client,
    body: {
      name: policyName,
      description: 'Policy for API Keys TS E2E testing',
      role: { admin: 'admin' },
      dataScope: {},
    },
  });
  expect(policyRes.error).toBeUndefined();
  const policyUuid = policyRes.data?.uuid!;
  expect(policyUuid).toBeDefined();
  tc.trackPolicy(policyUuid);
  return policyUuid;
}

describe('API Keys Lifecycle', () => {
  it('crud apikey', async () => {
    await using tc = newTestClient();
    const ts = Date.now();
    const { client } = tc;

    const policyUuid = await createTestPolicy(tc, ts);

    const saName = `sdk-ts-e2e-test-sa-for-apikey-${ts}`;
    const saEmail = `sdk-ts-e2e-test-${ts}@groundcover.com`;
    const saRes = await createServiceAccount({
      client,
      body: {
        name: saName,
        email: saEmail,
        policyUUIDs: [policyUuid],
      },
    });
    expect(saRes.error).toBeUndefined();
    const saId = saRes.data?.serviceAccountId!;
    expect(saId).toBeDefined();
    tc.trackServiceAccount(saId);

    const apikeyName = `sdk-ts-e2e-test-apikey-${ts}`;
    const createRes = await createApiKey({
      client,
      body: {
        name: apikeyName,
        serviceAccountId: saId,
        description: 'Created by TS SDK E2E test',
      },
    });
    expect(createRes.error).toBeUndefined();
    const apiKeyId = createRes.data?.id;
    expect(typeof apiKeyId).toBe('string');
    expect(apiKeyId!.length).toBeGreaterThan(0);
    expect(createRes.data?.apiKey).toBeDefined();
    tc.trackApiKey(apiKeyId!);

    const listRes = await listApiKeys({ client });
    expect(listRes.error).toBeUndefined();
    const apiKeys = listRes.data || [];
    expect(apiKeys.some((k) => k.id === apiKeyId)).toBe(true);

    const deleteApiKeyRes = await deleteApiKey({
      client,
      path: { id: apiKeyId! },
    });
    expect(deleteApiKeyRes.error).toBeUndefined();
    tc.untrackApiKey(apiKeyId!);

    const listRevoked = await listApiKeys({
      client,
      query: { withRevoked: true },
    });
    expect(listRevoked.error).toBeUndefined();
    const revokedKey = (listRevoked.data || []).find((k) => k.id === apiKeyId);
    expect(revokedKey).toBeDefined();
    expect(revokedKey?.revokedAt).toBeDefined();
    expect(revokedKey?.revokedAt!.length).toBeGreaterThan(0);

    const listAfter = await listApiKeys({ client });
    expect(listAfter.error).toBeUndefined();
    const apiKeysAfter = listAfter.data || [];
    expect(apiKeysAfter.some((k) => k.id === apiKeyId)).toBe(false);

    const deleteSaRes = await deleteServiceAccount({
      client,
      path: { id: saId },
    });
    expect(deleteSaRes.error).toBeUndefined();
    tc.untrackServiceAccount(saId);

    const deletePolicyRes = await deletePolicy({ client, path: { id: policyUuid } });
    expect(deletePolicyRes.error).toBeUndefined();
    tc.untrackPolicy(policyUuid);
  });
});
