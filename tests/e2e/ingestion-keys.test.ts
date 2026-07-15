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
        body: { name: keyName } as any, // Cast to any in case 'type' is required by types but optional in backend
      });

      // Handle the case where ingestion keys are not supported on inCloud backends
      if (createRes.error && String(createRes.error).includes('inCloud backends')) {
        console.warn('Ingestion keys not supported on inCloud backends');
        return;
      }

      expect(createRes.error).toBeUndefined();
      expect(createRes.response.status).toBe(200);

      const createData = createRes.data as any;
      keyId = createData?.id || createData?.keyId;
      expect(keyId).toBeDefined();

      // List
      const listRes = await listIngestionKeys({ client });
      expect(listRes.error).toBeUndefined();
      expect(listRes.response.status).toBe(200);
    } finally {
      if (keyId) {
        // Delete
        await deleteIngestionKey({
          client,
          body: { id: keyId } as any, // Cast to any because the model might expect 'name' but backend expects 'id'
        }).catch(() => {});
      }
    }
  });
});
