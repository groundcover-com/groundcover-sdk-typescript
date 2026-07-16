import { beforeAll, describe, expect, it } from 'vitest';
import {
  createMetricsAggregatorConfig,
  deleteMetricsAggregatorConfig,
  getMetricsAggregatorConfig,
  initClient,
  updateMetricsAggregatorConfig,
} from '../../src/index.js';

const AGGREGATOR_CONFIG = `content: |
  - ignore_old_samples: true
    match: '{__name__=~"test_metric_counter"}'
    without: [instance]
    interval: 30s
    outputs: [total_prometheus]
  - match: '{__name__=~"test_metric_latency"}'
    without: [instance]
    interval: 30s
    outputs: [avg]`;

const AGGREGATOR_CONFIG_UPDATED = `content: |
  - ignore_old_samples: true
    match: '{__name__=~"test_metric_counter_updated"}'
    without: [instance]
    interval: 60s
    outputs: [total_prometheus]
  - match: '{__name__=~"test_metric_latency_updated"}'
    without: [instance]
    interval: 60s
    outputs: [avg]`;

describe('Metrics Aggregator Lifecycle', () => {
  let client: ReturnType<typeof initClient>;

  beforeAll(() => {
    client = initClient();
  });

  it('crud metrics aggregator', async () => {
    try {
      // Create
      const createRes = await createMetricsAggregatorConfig({
        client,
        body: { value: AGGREGATOR_CONFIG },
      });
      expect(createRes.error).toBeUndefined();
      expect(createRes.response.status).toBe(201);

      const createData = createRes.data;
      expect(createData?.value).toBe(AGGREGATOR_CONFIG);
      expect(createData?.uuid).toBeDefined();
      expect(createData?.created_timestamp).toBeDefined();
      const originalTimestamp = createData?.created_timestamp;

      // Get - verify value matches
      const getRes = await getMetricsAggregatorConfig({ client });
      expect(getRes.error).toBeUndefined();
      expect(getRes.response.status).toBe(200);
      expect(getRes.data?.value).toBe(AGGREGATOR_CONFIG);

      // Update
      const updateRes = await updateMetricsAggregatorConfig({
        client,
        body: { value: AGGREGATOR_CONFIG_UPDATED },
      });
      expect(updateRes.error).toBeUndefined();
      expect(updateRes.response.status).toBe(200);

      const updateData = updateRes.data;
      expect(updateData?.value).toBe(AGGREGATOR_CONFIG_UPDATED);
      expect(updateData?.created_timestamp).toBeDefined();
      expect(updateData?.created_timestamp).not.toBe(originalTimestamp);

      // Get - verify updated value
      const getResUpdated = await getMetricsAggregatorConfig({ client });
      expect(getResUpdated.error).toBeUndefined();
      expect(getResUpdated.response.status).toBe(200);
      expect(getResUpdated.data?.value).toBe(AGGREGATOR_CONFIG_UPDATED);
    } finally {
      // Delete
      await deleteMetricsAggregatorConfig({ client }).catch(() => {});
    }

    // Verify deletion - should return empty value
    const getResDeleted = await getMetricsAggregatorConfig({ client });
    expect(getResDeleted.error).toBeUndefined();
    expect(getResDeleted.response.status).toBe(200);
    expect(getResDeleted.data?.value).toBe('');
  });
});
