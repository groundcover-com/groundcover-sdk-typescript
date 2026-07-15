import { beforeAll, describe, expect, it } from 'vitest';
import { getMetricKeys, getMetricNames, getMetricValues, initClient } from '../../src/index.js';

describe('Metrics Discovery', () => {
  let client: ReturnType<typeof initClient>;

  beforeAll(() => {
    client = initClient();
  });

  const getTimeRange = () => {
    const end = new Date();
    const start = new Date(end.getTime() - 60 * 60 * 1000);
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const extractList = (payload: any, key: string): any[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (payload[key]) return payload[key];
    if (payload.additionalProperties?.[key]) return payload.additionalProperties[key];
    return [];
  };

  it('List metric names', async () => {
    const { start, end } = getTimeRange();

    const result = await getMetricNames({
      client,
      body: {
        start,
        end,
        limit: 10,
        filter: '',
      },
    });

    expect(result.error).toBeUndefined();
    const metrics = extractList(result.data, 'metrics');
    expect(Array.isArray(metrics)).toBe(true);
  });

  it('List metric names filtered by a substring', async () => {
    const { start, end } = getTimeRange();

    const result = await getMetricNames({
      client,
      body: {
        start,
        end,
        limit: 5,
        filter: 'cpu',
      },
    });

    expect(result.error).toBeUndefined();
    const metrics = extractList(result.data, 'metrics');
    expect(Array.isArray(metrics)).toBe(true);
  });

  it('List metric label keys for an available metric', async (ctx) => {
    const { start, end } = getTimeRange();

    const namesResult = await getMetricNames({
      client,
      body: {
        start,
        end,
        limit: 1,
        filter: '',
      },
    });

    const metrics = extractList(namesResult.data, 'metrics');
    if (!metrics || metrics.length === 0) {
      ctx.skip();
      return;
    }

    const metricName =
      typeof metrics[0] === 'string' ? metrics[0] : metrics[0].name || String(metrics[0]);

    const result = await getMetricKeys({
      client,
      body: {
        name: metricName,
        start,
        end,
        limit: 10,
      },
    });

    expect(result.error).toBeUndefined();
    const keys = extractList(result.data, 'keys');
    expect(Array.isArray(keys)).toBe(true);
  });

  it('List metric label values for an available metric and key', async (ctx) => {
    const { start, end } = getTimeRange();

    const namesResult = await getMetricNames({
      client,
      body: {
        start,
        end,
        limit: 1,
        filter: '',
      },
    });

    const metrics = extractList(namesResult.data, 'metrics');
    if (!metrics || metrics.length === 0) {
      ctx.skip();
      return;
    }

    const metricName =
      typeof metrics[0] === 'string' ? metrics[0] : metrics[0].name || String(metrics[0]);

    const keysResult = await getMetricKeys({
      client,
      body: {
        name: metricName,
        start,
        end,
        limit: 1,
      },
    });

    const keys = extractList(keysResult.data, 'keys');
    if (!keys || keys.length === 0) {
      ctx.skip();
      return;
    }

    const keyName = keys[0];

    const result = await getMetricValues({
      client,
      body: {
        name: metricName,
        key: keyName,
        start,
        end,
        limit: 10,
      },
    });

    expect(result.error).toBeUndefined();
    const values = extractList(result.data, 'values');
    expect(Array.isArray(values)).toBe(true);
  });

  it('End time before start time should return an error', async () => {
    const { start, end } = getTimeRange();

    const result = await getMetricNames({
      client,
      body: {
        start: end, // Swapped
        end: start,
        limit: 10,
        filter: '',
      },
    });

    expect(result.error).toBeDefined();
  });

  it('Keys for a non-existent metric should return empty', async () => {
    const { start, end } = getTimeRange();

    const result = await getMetricKeys({
      client,
      body: {
        name: 'non_existent_metric_xyz123',
        start,
        end,
        limit: 10,
      },
    });

    expect(result.error).toBeUndefined();
    const keys = extractList(result.data, 'keys');
    expect(keys.length).toBe(0);
  });
});
