import { beforeAll, describe, expect, it } from 'vitest';
import {
  createIngestionKey,
  deleteIngestionKey,
  initClient,
  listIngestionKeys,
} from '../../src/index.js';

describe('Ingestion Keys API', () => {
  let client: ReturnType<typeof initClient>;

  beforeAll(() => {
    client = initClient();
  });

  it('crud ingestion key', async () => {
    const keyName = `sdk-e2e-test-ingestion-key-${Date.now()}`;
    let keyId: string | undefined;

    try {
      // Create
      const createRes = await createIngestionKey({
        client,
        body: { name: keyName, type: 'sensor' },
      });

      // Handle the case where ingestion keys are not supported on inCloud backends
      const errorMsg = (createRes.error as any)?.message || String(createRes.error);
      if (createRes.error && errorMsg.includes('inCloud backends')) {
        console.warn('Ingestion keys not supported on inCloud backends');
        return;
      }

      expect(createRes.error).toBeUndefined();
      expect([200, 201]).toContain(createRes.response.status); // Swagger documents 201, backend might return 200

      const createData = createRes.data as any;
      keyId = createData?.id; // Strictly assert on Swagger-documented `id` field
      expect(keyId).toBeDefined();

      // List
      let found = false;
      // Retry a few times to allow for backend eventual consistency if necessary
      for (let i = 0; i < 5; i++) {
        const listRes = await listIngestionKeys({ client });
        expect(listRes.error).toBeUndefined();
        expect(listRes.response.status).toBe(200);

        const keys = listRes.data || [];
        if (keys.some((k) => k.id === keyId)) {
          found = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      expect(found).toBe(true);
    } finally {
      if (keyId) {
        // Delete (Swagger documents DELETE with body { name: keyName })
        await deleteIngestionKey({
          client,
          body: { name: keyName },
        }).catch(() => {});
      }
    }
  });
});
