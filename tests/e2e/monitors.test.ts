import * as yaml from 'js-yaml';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  createMonitor,
  deleteMonitor,
  getMonitor,
  initClient,
  updateMonitor,
} from '../../src/index.js';

const getMonitorTemplate = (title: string, header: string) => ({
  title,
  display: {
    header,
    resourceHeaderLabels: ['namespace', 'workload'],
    contextHeaderLabels: ['cluster'],
    description: 'Pod has been in a non-running state for longer than 15 minutes',
  },
  severity: 'critical' as const,
  measurementType: 'state' as const,
  model: {
    queries: [
      {
        dataType: 'metrics',
        name: 'threshold_input_query',
        pipeline: {
          function: {
            name: 'avg_over_time',
            pipelines: [
              {
                function: {
                  name: 'max_by',
                  pipelines: [
                    {
                      metric: 'groundcover_kube_pod_status_phase',
                    },
                  ],
                  args: ['namespace', 'workload', 'cluster'],
                },
              },
            ],
            args: ['600'],
          },
        },
      },
    ],
    thresholds: [
      {
        name: 'threshold_1',
        inputName: 'threshold_input_query',
        operator: 'gt',
        values: [0],
      },
    ],
  },
  labels: {
    severity: 'critical',
  },
  annotations: {
    description: 'Pod {{ .Labels.namespace }}/{{ .Labels.pod }} not running for 15m',
    summary: 'Kubernetes Pod not healthy',
  },
  executionErrorState: 'OK' as const,
  noDataState: 'OK' as const,
  evaluationInterval: {
    interval: '1m',
    pendingFor: '0s',
  },
});

describe('Monitors Lifecycle', () => {
  let client: ReturnType<typeof initClient>;

  beforeAll(() => {
    client = initClient();
  });

  it('Monitor CRUD', async () => {
    const randomSuffix = Math.floor(Math.random() * 10000000);
    const title = `E2E Test - K8s Pod Not Healthy Monitor - ${randomSuffix}`;
    const header = `E2E Test - K8s Pod Not Healthy - ${randomSuffix}`;

    const monitorObj = getMonitorTemplate(title, header);

    // Create monitor
    const createResp = await createMonitor({
      client,
      body: monitorObj,
    });
    expect(createResp.error).toBeUndefined();

    const monitorId = (createResp.data as any)?.monitorId;
    expect(monitorId).toBeDefined();

    try {
      // Get monitor
      const getResp = await getMonitor({
        client,
        path: { id: monitorId },
      });
      expect(getResp.error).toBeUndefined();

      const monitorData = yaml.load(getResp.data as string) as any;
      expect(monitorData.title).toBe(title);

      // Verify pendingFor is preserved as 0s
      const evalInterval = monitorData.evaluationInterval || {};
      expect(evalInterval.pendingFor).toBe('0s');

      // Update monitor (change severity to warning)
      const updatedObj = {
        ...monitorObj,
        severity: 'warning' as const,
        labels: {
          ...monitorObj.labels,
          severity: 'warning',
        },
      };

      const updateResp = await updateMonitor({
        client,
        path: { id: monitorId },
        body: updatedObj,
      });
      expect(updateResp.error).toBeUndefined();

      // Verify update
      const getUpdatedResp = await getMonitor({
        client,
        path: { id: monitorId },
      });
      expect(getUpdatedResp.error).toBeUndefined();

      const updatedData = yaml.load(getUpdatedResp.data as string) as any;
      expect(updatedData.severity).toBe('warning');
      expect(updatedData.title).toBe(title);

      // Test duplicate creation (should fail with 409)
      const dupResp = await createMonitor({
        client,
        body: monitorObj,
      });
      expect(dupResp.error).toBeDefined();
      expect(dupResp.response.status).toBe(409);
    } finally {
      // Delete monitor
      await deleteMonitor({
        client,
        path: { id: monitorId },
      }).catch(() => {});
    }
  });
});
