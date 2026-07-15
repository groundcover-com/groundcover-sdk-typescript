import { beforeAll, describe, expect, it } from 'vitest';
import {
  createLogsPipelineConfig,
  createMetricsPipelineConfig,
  createTracesPipelineConfig,
  deleteLogsPipelineConfig,
  deleteMetricsPipelineConfig,
  deleteTracesPipelineConfig,
  getLogsPipelineConfig,
  getMetricsPipelineConfig,
  getTracesPipelineConfig,
  initClient,
  updateLogsPipelineConfig,
  updateMetricsPipelineConfig,
  updateTracesPipelineConfig,
} from '../../src/index.js';

const LOGS_CONFIG = `ottlRules:
- ruleName: example-rule
  conditions:
    - container_name == "nginx"
  statements:
    - set(attributes["test.key"], "test-value")`;

const LOGS_CONFIG_UPDATED = `ottlRules:
- ruleName: example-rule-updated
  conditions:
    - container_name == "nginx"
  statements:
    - set(attributes["test.key"], "test-value-updated")`;

const TRACES_CONFIG = `ottlRules:
- ruleName: example-rule
  conditions:
    - workload == "nginx"
  statements:
    - set(attributes["test.key"], "test-value")`;

const TRACES_CONFIG_UPDATED = `ottlRules:
- ruleName: example-rule-updated
  conditions:
    - workload == "nginx"
  statements:
    - set(attributes["test.key"], "test-value-updated")`;

describe('Pipelines Lifecycle', () => {
  let client: ReturnType<typeof initClient>;

  beforeAll(() => {
    client = initClient();
  });

  describe('Logs Pipeline Lifecycle', () => {
    it('Logs pipeline CRUD', async () => {
      let originalTimestamp: string;

      try {
        // Create
        const createResult = await createLogsPipelineConfig({
          client,
          body: { value: LOGS_CONFIG },
        });
        expect(createResult.error).toBeUndefined();
        expect(createResult.response.status).toBe(201);

        const createData = createResult.data as any;
        expect(createData.value).toBe(LOGS_CONFIG);
        expect(createData.uuid).toBeDefined();
        expect(createData.created_timestamp).toBeDefined();
        originalTimestamp = createData.created_timestamp;

        // Get
        const getResult = await getLogsPipelineConfig({ client });
        expect(getResult.error).toBeUndefined();
        expect(getResult.response.status).toBe(200);
        expect((getResult.data as any).value).toBe(LOGS_CONFIG);

        // Update
        const updateResult = await updateLogsPipelineConfig({
          client,
          body: { value: LOGS_CONFIG_UPDATED },
        });
        expect(updateResult.error).toBeUndefined();
        expect(updateResult.response.status).toBe(200);

        const updateData = updateResult.data as any;
        expect(updateData.value).toBe(LOGS_CONFIG_UPDATED);
        expect(updateData.created_timestamp).toBeDefined();
        expect(new Date(updateData.created_timestamp).getTime()).toBeGreaterThan(
          new Date(originalTimestamp).getTime(),
        );

        // Get updated
        const getUpdatedResult = await getLogsPipelineConfig({ client });
        expect(getUpdatedResult.error).toBeUndefined();
        expect(getUpdatedResult.response.status).toBe(200);
        expect((getUpdatedResult.data as any).value).toBe(LOGS_CONFIG_UPDATED);
      } finally {
        // Delete
        await deleteLogsPipelineConfig({ client }).catch(() => {});
      }

      // Verify deletion
      const getDeletedResult = await getLogsPipelineConfig({ client });
      expect(getDeletedResult.error).toBeUndefined();
      expect(getDeletedResult.response.status).toBe(200);
      expect((getDeletedResult.data as any).value).toBe('');
    });
  });

  describe('Traces Pipeline Lifecycle', () => {
    it('Traces pipeline CRUD', async () => {
      let originalTimestamp: string;

      try {
        // Create
        const createResult = await createTracesPipelineConfig({
          client,
          body: { value: TRACES_CONFIG },
        });
        expect(createResult.error).toBeUndefined();
        expect(createResult.response.status).toBe(201);

        const createData = createResult.data as any;
        expect(createData.value).toBe(TRACES_CONFIG);
        expect(createData.uuid).toBeDefined();
        expect(createData.created_timestamp).toBeDefined();
        originalTimestamp = createData.created_timestamp;

        // Get
        const getResult = await getTracesPipelineConfig({ client });
        expect(getResult.error).toBeUndefined();
        expect(getResult.response.status).toBe(200);
        expect((getResult.data as any).value).toBe(TRACES_CONFIG);

        // Update
        const updateResult = await updateTracesPipelineConfig({
          client,
          body: { value: TRACES_CONFIG_UPDATED },
        });
        expect(updateResult.error).toBeUndefined();
        expect(updateResult.response.status).toBe(200);

        const updateData = updateResult.data as any;
        expect(updateData.value).toBe(TRACES_CONFIG_UPDATED);
        expect(updateData.created_timestamp).toBeDefined();
        expect(new Date(updateData.created_timestamp).getTime()).toBeGreaterThan(
          new Date(originalTimestamp).getTime(),
        );

        // Get updated
        const getUpdatedResult = await getTracesPipelineConfig({ client });
        expect(getUpdatedResult.error).toBeUndefined();
        expect(getUpdatedResult.response.status).toBe(200);
        expect((getUpdatedResult.data as any).value).toBe(TRACES_CONFIG_UPDATED);
      } finally {
        // Delete
        await deleteTracesPipelineConfig({ client }).catch(() => {});
      }

      // Verify deletion
      const getDeletedResult = await getTracesPipelineConfig({ client });
      expect(getDeletedResult.error).toBeUndefined();
      expect(getDeletedResult.response.status).toBe(200);
      expect((getDeletedResult.data as any).value).toBe('');
    });
  });

  describe('Metrics Pipeline Lifecycle', () => {
    it('Metrics pipeline CRUD', async () => {
      let originalTimestamp: string;

      try {
        // Create
        const createResult = await createMetricsPipelineConfig({
          client,
          body: {
            rules: {
              keepRegex: ['http_requests_total', 'process_cpu_seconds_total'],
              addLabel: { team: 'platform' },
            },
          },
        });
        expect(createResult.error).toBeUndefined();
        expect(createResult.response.status).toBe(201);

        const createData = createResult.data as any;
        expect(createData.rules.keepRegex).toEqual([
          'http_requests_total',
          'process_cpu_seconds_total',
        ]);
        expect(createData.rules.addLabel).toEqual({ team: 'platform' });
        expect(createData.uuid).toBeDefined();
        expect(createData.created_timestamp).toBeDefined();
        originalTimestamp = createData.created_timestamp;

        // Get
        const getResult = await getMetricsPipelineConfig({ client });
        expect(getResult.error).toBeUndefined();
        expect(getResult.response.status).toBe(200);
        const getData = getResult.data as any;
        expect(getData.rules.keepRegex).toEqual([
          'http_requests_total',
          'process_cpu_seconds_total',
        ]);
        expect(getData.rules.addLabel).toEqual({ team: 'platform' });

        // Update
        const updateResult = await updateMetricsPipelineConfig({
          client,
          body: {
            rules: {
              keepRegex: ['http_requests_total', 'node_cpu_seconds_total'],
              dropRegex: ['go_.*'],
              addLabel: { team: 'platform', env: 'staging' },
            },
          },
        });
        expect(updateResult.error).toBeUndefined();
        expect(updateResult.response.status).toBe(200);

        const updateData = updateResult.data as any;
        expect(updateData.rules.keepRegex).toEqual([
          'http_requests_total',
          'node_cpu_seconds_total',
        ]);
        expect(updateData.rules.dropRegex).toEqual(['go_.*']);
        expect(updateData.rules.addLabel).toEqual({ team: 'platform', env: 'staging' });
        expect(new Date(updateData.created_timestamp).getTime()).toBeGreaterThan(
          new Date(originalTimestamp).getTime(),
        );

        // Get updated
        const getUpdatedResult = await getMetricsPipelineConfig({ client });
        expect(getUpdatedResult.error).toBeUndefined();
        expect(getUpdatedResult.response.status).toBe(200);
        expect((getUpdatedResult.data as any).rules.dropRegex).toEqual(['go_.*']);
      } finally {
        // Delete
        await deleteMetricsPipelineConfig({ client }).catch(() => {});
      }

      // Verify deletion
      const getDeletedResult = await getMetricsPipelineConfig({ client });
      expect(getDeletedResult.error).toBeUndefined();
      expect(getDeletedResult.response.status).toBe(200);
      expect((getDeletedResult.data as any).rules).toBeUndefined();
    });
  });
});
