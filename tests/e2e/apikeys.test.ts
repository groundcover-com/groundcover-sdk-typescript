import { beforeAll, describe, expect, it } from 'vitest';
import {
  createApiKey,
  createPolicy,
  createServiceAccount,
  deleteApiKey,
  deletePolicy,
  deleteServiceAccount,
  initClient,
  listApiKeys,
} from '../../src/index.js';

describe('API Keys Lifecycle', () => {
  let client: ReturnType<typeof initClient>;

  beforeAll(() => {
    // Requires GC_API_KEY, GC_BACKEND_ID to be set in environment
    client = initClient();
  });

  it('crud apikey', async () => {
    const ts = Date.now();
    const policyName = `sdk-ts-e2e-test-policy-for-apikey-${ts}`;

    // Step 1: Create policy
    const policyRes = await createPolicy({
      client,
      body: {
        name: policyName,
        description: 'Policy for API Keys TS E2E testing',
        role: { admin: 'admin' },
        dataScope: {},
      },
    });
    expect(policyRes.error).toBeUndefined();
    const policyUuid = policyRes.data?.uuid;

    try {
      // Step 2: Create Service Account
      const saName = `sdk-ts-e2e-test-sa-for-apikey-${ts}`;
      const saEmail = `sdk-ts-e2e-test-${ts}@groundcover.com`;
      const saRes = await createServiceAccount({
        client,
        body: {
          name: saName,
          email: saEmail,
          policyUUIDs: [policyUuid!],
        },
      });
      expect(saRes.error).toBeUndefined();
      const saId = saRes.data?.serviceAccountId;

      try {
        // Create API Key
        const apikeyName = `sdk-ts-e2e-test-apikey-${ts}`;
        const createRes = await createApiKey({
          client,
          body: {
            name: apikeyName,
            serviceAccountId: saId!,
            description: 'Created by TS SDK E2E test',
          },
        });
        expect(createRes.error).toBeUndefined();
        const apiKeyId = createRes.data?.id;
        expect(apiKeyId).toBeDefined();
        expect(createRes.data?.apiKey).toBeDefined();

        // List API keys
        const listRes = await listApiKeys({ client });
        expect(listRes.error).toBeUndefined();

        let apiKeys = listRes.data || [];
        if (!Array.isArray(apiKeys)) {
          apiKeys = (apiKeys as any).apiKeys || (apiKeys as any).items || [];
        }

        const found = (apiKeys as any[]).some((k) => k.id === apiKeyId);
        expect(found).toBe(true);

        // Delete API key
        await deleteApiKey({
          client,
          path: { id: apiKeyId! },
        });

        // Verify deletion
        const listAfter = await listApiKeys({ client });
        let apiKeysAfter = listAfter.data || [];
        if (!Array.isArray(apiKeysAfter)) {
          apiKeysAfter = (apiKeysAfter as any).apiKeys || (apiKeysAfter as any).items || [];
        }
        const foundAfter = (apiKeysAfter as any[]).some((k) => k.id === apiKeyId);
        expect(foundAfter).toBe(false);
      } finally {
        await deleteServiceAccount({
          client,
          path: { serviceAccountId: saId! },
        }).catch(() => {});
      }
    } finally {
      await deletePolicy({
        client,
        path: { uuid: policyUuid! },
      }).catch(() => {});
    }
  });
});
