import { describe, expect, it } from 'vitest';
import {
  createDataIntegrationConfig,
  deleteDataIntegrationConfig,
  describeDataIntegration,
  getDataIntegrationConfig,
  getDataIntegrationConfigs,
  updateDataIntegrationConfig,
} from '../../src/index.js';
import { newTestClient } from './setup.js';

const CLOUDWATCH_CONFIG = `{
  "version": 1,
  "name": "test-cloudwatch",
  "scrapeInterval": "5m",
  "stsRegion": "us-east-1",
  "exporters": ["prometheus"],
  "regions": ["us-east-1"],
  "roleArn": "arn:aws:iam::123456789012:role/test-role",
  "awsMetrics": [
    {
      "namespace": "AWS/EC2",
      "metrics": [
        {
          "name": "CPUUtilization",
          "statistics": ["Average"],
          "period": 300,
          "length": 300,
          "nullAsZero": false
        }
      ]
    }
  ],
  "apiConcurrencyLimits": {
    "listMetrics": 3,
    "getMetricData": 5,
    "getMetricStatistics": 5,
    "listInventory": 10
  },
  "withContextTagsOnInfoMetrics": false,
  "withInventoryDiscovery": true
}`;

const CLOUDWATCH_CONFIG_UPDATED = `{
  "version": 1,
  "name": "test-cloudwatch",
  "scrapeInterval": "5m",
  "stsRegion": "us-east-2",
  "exporters": ["prometheus"],
  "regions": ["us-east-2"],
  "roleArn": "arn:aws:iam::123456789012:role/test-role",
  "awsMetrics": [
    {
      "namespace": "AWS/EC2",
      "metrics": [
        {
          "name": "CPUUtilization",
          "statistics": ["Average"],
          "period": 300,
          "length": 300,
          "nullAsZero": false
        }
      ]
    }
  ],
  "apiConcurrencyLimits": {
    "listMetrics": 1,
    "getMetricData": 5,
    "getMetricStatistics": 5,
    "listInventory": 10
  },
  "withContextTagsOnInfoMetrics": false,
  "withInventoryDiscovery": true
}`;

describe('Data Integrations Lifecycle', () => {
  it('list data integration configs', async () => {
    await using tc = newTestClient();
    const result = await getDataIntegrationConfigs({ client: tc.client });
    expect(result.error).toBeUndefined();
    expect(result.response.status).toBe(200);
  });

  it('describe data integration type', async () => {
    await using tc = newTestClient();
    const result = await describeDataIntegration({
      client: tc.client,
      path: { type: 'cloudwatch' },
    });
    expect(result.error).toBeUndefined();
    expect(result.response.status).toBe(200);
  });

  it('cloudwatch crud', async () => {
    await using tc = newTestClient();
    const uniqueName = `sdk-e2e-test-cloudwatch-${Date.now()}`;
    const { client } = tc;

    const createRes = await createDataIntegrationConfig({
      client,
      path: { type: 'cloudwatch' },
      body: {
        config: CLOUDWATCH_CONFIG,
        name: uniqueName,
      },
    });
    expect(createRes.error).toBeUndefined();
    expect(createRes.response.status).toBe(201);

    const createData = createRes.data;
    expect(createData?.config).toBe(CLOUDWATCH_CONFIG);
    expect(createData?.id).toBeDefined();
    expect(createData?.update_timestamp).toBeDefined();
    expect(createData?.is_archived).not.toBe(true);

    const configId = createData!.id!;
    tc.trackDataIntegrationConfig('cloudwatch', configId);
    const originalTimestamp = createData?.update_timestamp;

    const getRes = await getDataIntegrationConfig({
      client,
      path: { type: 'cloudwatch', id: configId },
    });
    expect(getRes.error).toBeUndefined();
    expect(getRes.response.status).toBe(200);
    expect(getRes.data?.config).toBe(CLOUDWATCH_CONFIG);

    const updateRes = await updateDataIntegrationConfig({
      client,
      path: { type: 'cloudwatch', id: configId },
      body: {
        config: CLOUDWATCH_CONFIG_UPDATED,
        name: uniqueName,
      },
    });
    expect(updateRes.error).toBeUndefined();
    expect(updateRes.response.status).toBe(200);
    expect(updateRes.data?.update_timestamp).not.toBe(originalTimestamp);

    const getResUpdated = await getDataIntegrationConfig({
      client,
      path: { type: 'cloudwatch', id: configId },
    });
    expect(getResUpdated.error).toBeUndefined();
    expect(getResUpdated.data?.config).toBe(CLOUDWATCH_CONFIG_UPDATED);

    await deleteDataIntegrationConfig({
      client,
      path: { type: 'cloudwatch', id: configId },
    });
    tc.untrackDataIntegrationConfig('cloudwatch', configId);

    const getResDeleted = await getDataIntegrationConfig({
      client,
      path: { type: 'cloudwatch', id: configId },
    });
    expect(getResDeleted.error).toBeDefined();
    expect([404, 400]).toContain(getResDeleted.response.status);
  });
});
