import { beforeAll, describe, expect, it } from 'vitest';
import { initClient, searchTraces } from '../../src/index.js';

describe('Traces Search', () => {
  let client: ReturnType<typeof initClient>;

  beforeAll(() => {
    client = initClient();
  });

  it('search traces', async () => {
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000); // -24 hours

    const result = await searchTraces({
      client,
      body: {
        start: start.toISOString(),
        end: now.toISOString(),
        query: '* | stats count(*)',
      },
    });

    expect(result.error).toBeUndefined();
    const payload = result.data;
    expect(Array.isArray(payload)).toBe(true);
    expect(payload!.length).toBeGreaterThan(0);
    expect((payload as any[])[0].count).toBeGreaterThan(0);
  });
});
