import { beforeAll, describe, expect, it } from 'vitest';
import { clustersList, getEventsOverTime, initClient, workloadsList } from '../../src/index.js';

describe('K8s API', () => {
  let client: ReturnType<typeof initClient>;

  beforeAll(() => {
    client = initClient();
  });

  it('list clusters', async () => {
    const result = await clustersList({
      client,
      body: {},
    });
    expect(result.error).toBeUndefined();
    expect(result.response.status).toBe(200);

    const payload = result.data as any;
    expect(payload).toBeDefined();
    expect(payload.clusters).toBeDefined();
  });

  it('list workloads', async () => {
    const result = await workloadsList({
      client,
      body: {
        sortBy: 'rps',
        order: 'desc',
      },
    });
    expect(result.error).toBeUndefined();
    expect(result.response.status).toBe(200);

    const payload = result.data as any;
    expect(payload).toBeDefined();
    expect(payload.workloads).toBeDefined();
  });

  it('get events over time', async () => {
    const now = new Date();
    const start = new Date(now.getTime() - 15 * 60 * 1000); // 15 minutes ago

    const result = await getEventsOverTime({
      client,
      body: {
        start: start.toISOString(),
        end: now.toISOString(),
        sortBy: 'timestamp',
        sortOrder: 'desc',
        conditions: [],
        withRawEvents: true,
      },
    });
    expect(result.error).toBeUndefined();
    expect(result.response.status).toBe(200);

    const payload = result.data as any;
    expect(payload).toBeDefined();
    const events = payload.events || [];
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
  });
});
