import { beforeAll, describe, expect, it } from 'vitest';
import { initClient, metricsQuery } from '../../src/index.js';

describe('Metrics Query', () => {
  let client: ReturnType<typeof initClient>;

  beforeAll(() => {
    client = initClient();
  });

  it('execute a metrics range query and verify the response', async () => {
    const now = new Date();
    const start = new Date(now.getTime() - 15 * 60 * 1000);

    const result = await metricsQuery({
      client,
      body: {
        start: start.toISOString(),
        end: now.toISOString(),
        step: '1m',
        queryType: 'RANGE',
        promql: 'up',
      },
    });

    expect(result.error).toBeUndefined();

    const payload = result.data as any;
    expect(payload.status).toBe('success');
    expect(payload.data).toBeDefined();
    expect(payload.data).not.toBeNull();
  });
});
