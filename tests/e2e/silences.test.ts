import { describe, expect, it } from 'vitest';
import {
  createSilence,
  deleteSilence,
  getAllSilences,
  getSilence,
  updateSilence,
} from '../../src/index.js';
import { newTestClient } from './setup.js';

describe('Silences Lifecycle', () => {
  it('crud silence', async () => {
    await using tc = newTestClient();
    const now = new Date();
    const silenceComment = `e2e-ts-test-silence-${Date.now()}`;
    const { client } = tc;

    const startsAt = new Date(now.getTime() + 60 * 1000);
    const endsAt = new Date(now.getTime() + 61 * 60 * 1000);

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
    tc.trackSilence(silenceId!);

    const getRes = await getSilence({ client, path: { id: silenceId! } });
    expect(getRes.error).toBeUndefined();
    expect(getRes.data?.id).toBe(silenceId);
    expect(getRes.data?.comment).toBe(silenceComment);
    expect(getRes.data?.matchers?.length).toBeGreaterThan(0);

    const listRes = await getAllSilences({ client });
    expect(listRes.error).toBeUndefined();
    expect(Array.isArray(listRes.data)).toBe(true);
    expect(listRes.data!.some((s) => s.id === silenceId)).toBe(true);

    const updatedComment = 'Updated silence comment during E2E testing';
    const updateStartsAt = new Date(now.getTime() + 2 * 60 * 1000);
    const updateEndsAt = new Date(now.getTime() + 122 * 60 * 1000);

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

    const getUpdatedRes = await getSilence({ client, path: { id: silenceId! } });
    expect(getUpdatedRes.error).toBeUndefined();
    expect(getUpdatedRes.data?.comment).toBe(updatedComment);

    const deleteRes = await deleteSilence({ client, path: { id: silenceId! } });
    expect(deleteRes.error).toBeUndefined();
    tc.untrackSilence(silenceId!);

    const getDeletedRes = await getSilence({ client, path: { id: silenceId! } });
    expect(getDeletedRes.error).toBeDefined();
    expect(getDeletedRes.response.status).toBe(404);
  });
});
