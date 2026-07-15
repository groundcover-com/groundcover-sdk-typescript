import { beforeAll, describe, expect, it } from 'vitest';
import {
  createSilence,
  deleteSilence,
  getAllSilences,
  getSilence,
  initClient,
  updateSilence,
} from '../../src/index.js';

describe('Silences Lifecycle', () => {
  let client: ReturnType<typeof initClient>;

  beforeAll(() => {
    client = initClient();
  });

  it('crud silence', async () => {
    const now = new Date();
    const silenceComment = `e2e-ts-test-silence-${Date.now()}`;

    const startsAt = new Date(now.getTime() + 60 * 1000); // +1 minute
    const endsAt = new Date(now.getTime() + 61 * 60 * 1000); // +1 hour 1 minute

    // Create
    const createRes = await createSilence({
      client,
      body: {
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        matchers: [
          { isEqual: true, isRegex: false, name: 'service', value: 'test-equal' },
          { isEqual: false, isRegex: true, name: 'environment', value: '*test-not-equal-regex*' },
          { isEqual: true, isRegex: false, name: 'workload', value: 'test-empty-equal' },
        ],
        comment: silenceComment,
      },
    });
    expect(createRes.error).toBeUndefined();
    const silenceId = createRes.data?.id;
    expect(silenceId).toBeDefined();

    try {
      // Get
      const getRes = await getSilence({ client, path: { id: silenceId! } });
      expect(getRes.error).toBeUndefined();
      expect(getRes.data?.id).toBe(silenceId);
      expect(getRes.data?.comment).toBe(silenceComment);
      expect(getRes.data?.matchers?.length).toBeGreaterThan(0);

      // List all
      const listRes = await getAllSilences({ client });
      expect(listRes.error).toBeUndefined();
      const silences =
        (listRes.data as any)?.silences ||
        (listRes.data as any)?.items ||
        (Array.isArray(listRes.data) ? listRes.data : []);
      const found = silences.some((s: any) => s.id === silenceId);
      expect(found).toBe(true);

      // Update
      const updatedComment = 'Updated silence comment during E2E testing';
      const updateStartsAt = new Date(now.getTime() + 2 * 60 * 1000); // +2 minutes
      const updateEndsAt = new Date(now.getTime() + 122 * 60 * 1000); // +2 hours 2 minutes

      const updateRes = await updateSilence({
        client,
        path: { id: silenceId! },
        body: {
          startsAt: updateStartsAt.toISOString(),
          endsAt: updateEndsAt.toISOString(),
          comment: updatedComment,
          matchers: [
            { isEqual: true, isRegex: false, name: 'service', value: 'updated-test-service' },
            { isEqual: true, isRegex: false, name: 'environment', value: 'production' },
          ],
        },
      });
      expect(updateRes.error).toBeUndefined();

      // Verify update
      const getUpdatedRes = await getSilence({ client, path: { id: silenceId! } });
      expect(getUpdatedRes.error).toBeUndefined();
      expect(getUpdatedRes.data?.comment).toBe(updatedComment);
    } finally {
      if (silenceId) {
        // Delete
        const deleteRes = await deleteSilence({ client, path: { id: silenceId } });
        expect(deleteRes.error).toBeUndefined();
      }
    }

    // Verify deletion
    const getDeletedRes = await getSilence({ client, path: { id: silenceId! } });
    expect(getDeletedRes.error).toBeDefined();
    expect(getDeletedRes.response.status).toBe(404);
  });
});
