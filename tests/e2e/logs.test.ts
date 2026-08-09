import { beforeAll, describe, expect, it } from 'vitest';
import { initClient, searchLogs } from '../../src/index.js';

describe('Logs Search', () => {
  let client: ReturnType<typeof initClient>;

  beforeAll(() => {
    client = initClient();
  });

  it('execute a logs search and verify results', async () => {
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const result = await searchLogs({
      client,
      body: {
        start: start.toISOString(),
        end: now.toISOString(),
        query: '* | stats count(*)',
      },
    });

    expect(result.error).toBeUndefined();

    const payload = result.data as any[];
    expect(Array.isArray(payload)).toBe(true);
    expect(payload.length).toBeGreaterThan(0);
    expect(payload[0]?.count || 0).toBeGreaterThan(0);
  });
});
