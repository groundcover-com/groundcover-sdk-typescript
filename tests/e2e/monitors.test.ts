import { describe, expect, it } from 'vitest';
import { createMonitor, deleteMonitor, getMonitorParsed, updateMonitor } from '../../src/index.js';
import { newTestClient } from './setup.js';

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
  it('Monitor CRUD', async () => {
    await using tc = newTestClient();
    const randomSuffix = Math.floor(Math.random() * 10000000);
    const title = `E2E Test - K8s Pod Not Healthy Monitor - ${randomSuffix}`;
    const header = `E2E Test - K8s Pod Not Healthy - ${randomSuffix}`;
    const monitorObj = getMonitorTemplate(title, header);
    const { client } = tc;

    const createResp = await createMonitor({ client, body: monitorObj });
    expect(createResp.error).toBeUndefined();

    const monitorId = createResp.data?.monitorId;
    expect(typeof monitorId).toBe('string');
    expect(monitorId.length).toBeGreaterThan(0);
    tc.trackMonitor(monitorId);

    const getResp = await getMonitorParsed({ client, path: { id: monitorId } });
    expect(getResp.error).toBeNull();

    const monitorData = getResp.data as any;
    expect(monitorData.title).toBe(title);

    const evalInterval = monitorData.evaluationInterval || {};
    expect(evalInterval.pendingFor).toBe('0s');

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

    const getUpdatedResp = await getMonitorParsed({ client, path: { id: monitorId } });
    expect(getUpdatedResp.error).toBeNull();

    const updatedData = getUpdatedResp.data as any;
    expect(updatedData.severity).toBe('warning');
    expect(updatedData.title).toBe(title);

    const dupResp = await createMonitor({ client, body: monitorObj });
    expect(dupResp.error).toBeDefined();
    expect(dupResp.response.status).toBe(409);

    const deleteResp = await deleteMonitor({ client, path: { id: monitorId } });
    expect(deleteResp.error).toBeUndefined();
    tc.untrackMonitor(monitorId);
  });
});
