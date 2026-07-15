import { beforeAll, describe, expect, it } from 'vitest';
import { createWorkflow, deleteWorkflow, initClient, listWorkflows } from '../../src/index.js';

describe('Workflows Lifecycle', () => {
  let client: ReturnType<typeof initClient>;

  beforeAll(() => {
    client = initClient();
  });

  it('crud workflow', async () => {
    const workflowUuid = crypto.randomUUID();

    const workflowDefinition = `workflow:
  id: e2e-test-simple-${workflowUuid}
  description: Simple e2e test workflow
  triggers:
    - type: alert
  actions:
    - name: test-action
      provider:
        type: slack
        config: ' {{ providers.slack_test }} '
        with:
          message: 'Test message'`;

    // Create workflow
    const createRes = await createWorkflow({
      client,
      body: workflowDefinition as any, // text/plain body
    });
    expect(createRes.error).toBeUndefined();
    const createPayload = createRes.data as any;
    const workflowId = createPayload?.workflow_id || createPayload?.workflowId;
    expect(workflowId).toBeDefined();
    expect(createPayload?.status).toBeDefined();
    expect(createPayload?.revision ?? 0).toBeGreaterThan(0);

    try {
      // List workflows
      const listRes = await listWorkflows({ client });
      expect(listRes.error).toBeUndefined();
      const workflows =
        (listRes.data as any)?.workflows ||
        (listRes.data as any)?.items ||
        (Array.isArray(listRes.data) ? listRes.data : []);

      const found = workflows.find((w: any) => w.id === workflowId);
      expect(found).toBeDefined();
      expect(found?.name).toContain('e2e-test-simple');
    } finally {
      if (workflowId) {
        // Delete workflow
        const deleteRes = await deleteWorkflow({ client, path: { id: workflowId } });
        expect(deleteRes.error).toBeUndefined();
      }
    }

    // Verify deletion
    const listAfterRes = await listWorkflows({ client });
    expect(listAfterRes.error).toBeUndefined();
    const workflowsAfter =
      (listAfterRes.data as any)?.workflows ||
      (listAfterRes.data as any)?.items ||
      (Array.isArray(listAfterRes.data) ? listAfterRes.data : []);
    const foundAfter = workflowsAfter.find((w: any) => w.id === workflowId);
    expect(foundAfter).toBeUndefined();
  });
});
