import { beforeAll, describe, expect, it } from 'vitest';
import { eventsSearch, initClient } from '../../src/index.js';

describe('Events API', () => {
  let client: ReturnType<typeof initClient>;

  beforeAll(() => {
    client = initClient();
  });

  it('events search', async () => {
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    const result = await eventsSearch({
      client,
      body: {
        start: start.toISOString(),
        end: now.toISOString(),
        query: '* | stats count(*)',
      },
    });

    expect(result.error).toBeUndefined();
    expect(result.response.status).toBe(200);

    const payload = result.data;
    expect(Array.isArray(payload)).toBe(true);
    expect(payload!.length).toBeGreaterThan(0);
    expect((payload as any[])[0]?.count).toBeGreaterThan(0);
  });
});
