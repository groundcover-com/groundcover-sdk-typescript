import { describe, expect, it } from 'vitest';
import { createIngestionKey, deleteIngestionKey, listIngestionKeys } from '../../src/index.js';
import { newTestClient, pollUntil } from './setup.js';

function isInCloudUnsupportedCreate(
  createRes: Awaited<ReturnType<typeof createIngestionKey>>,
): boolean {
  if (!createRes.error) {
    return false;
  }
  const message =
    typeof createRes.error === 'object' && createRes.error !== null && 'message' in createRes.error
      ? String((createRes.error as { message?: string }).message)
      : String(createRes.error);
  return createRes.response.status === 400 && message.includes('inCloud backends');
}

describe('Ingestion Keys API', () => {
  it('crud ingestion key', async (ctx) => {
    await using tc = newTestClient();
    const keyName = `sdk-e2e-test-ingestion-key-${Date.now()}`;
    const { client } = tc;

    const createRes = await createIngestionKey({
      client,
      body: { name: keyName, type: 'sensor' },
    });

    if (isInCloudUnsupportedCreate(createRes)) {
      ctx.skip('Ingestion keys not supported on inCloud backends');
    }

    expect(createRes.error).toBeUndefined();
    expect(createRes.response.status).toBe(201);

    const keyId = createRes.data?.id;
    expect(typeof keyId).toBe('string');
    expect(keyId.length).toBeGreaterThan(0);
    tc.trackIngestionKey(keyName);

    await pollUntil({
      fn: async () => {
        const listRes = await listIngestionKeys({ client });
        expect(listRes.error).toBeUndefined();
        expect(listRes.response.status).toBe(200);
        return listRes.data ?? [];
      },
      predicate: (keys) => keys.some((k) => k.id === keyId),
      timeoutMs: 30_000,
      intervalMs: 1_000,
      label: `ingestion key ${keyId} to appear in list`,
    });

    const deleteRes = await deleteIngestionKey({ client, body: { name: keyName } });
    expect(deleteRes.error).toBeUndefined();
    tc.untrackIngestionKey(keyName);
  });
});
