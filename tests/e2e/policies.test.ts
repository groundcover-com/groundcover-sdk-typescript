import { beforeAll, describe, expect, it } from 'vitest';
import {
  applyPolicy,
  createPolicy,
  deletePolicy,
  getPolicy,
  getPolicyAuditTrail,
  initClient,
  listPolicies,
  updatePolicy,
} from '../../src/index.js';

describe('Policies Lifecycle', () => {
  let client: ReturnType<typeof initClient>;

  beforeAll(() => {
    client = initClient();
  });

  it('crud policy', async () => {
    const ts = Date.now();
    const policyName = `sdk-ts-e2e-test-policy-${ts}`;

    // Create
    const createRes = await createPolicy({
      client,
      body: {
        name: policyName,
        description: 'E2E test policy',
        role: { write: '' },
        dataScope: {},
      },
    });
    expect(createRes.error).toBeUndefined();
    const policyUuid = createRes.data?.uuid;
    expect(policyUuid).toBeDefined();

    try {
      // List
      const listRes = await listPolicies({ client });
      expect(listRes.error).toBeUndefined();
      const policies =
        (listRes.data as any)?.policies ||
        (listRes.data as any)?.items ||
        (Array.isArray(listRes.data) ? listRes.data : []);
      const found = policies.some((p: any) => p.uuid === policyUuid);
      expect(found).toBe(true);

      // Get
      const getRes = await getPolicy({ client, path: { id: policyUuid! } });
      expect(getRes.error).toBeUndefined();
      expect(getRes.data?.uuid).toBe(policyUuid);
      expect(getRes.data?.name).toBe(policyName);

      // Update
      const updatedDesc = 'E2E test policy - updated';
      const updateRes = await updatePolicy({
        client,
        path: { id: policyUuid! },
        body: {
          name: policyName,
          description: updatedDesc,
          role: { admin: '' },
          dataScope: {},
          currentRevision: 1,
        },
      });
      expect(updateRes.error).toBeUndefined();

      // Verify update via Get
      const getUpdatedRes = await getPolicy({ client, path: { id: policyUuid! } });
      expect(getUpdatedRes.error).toBeUndefined();
      expect(getUpdatedRes.data?.uuid).toBe(policyUuid);
      expect(getUpdatedRes.data?.name).toBe(policyName);
      expect(getUpdatedRes.data?.description).toBe(updatedDesc);

      // Apply policy
      const applyRes = await applyPolicy({
        client,
        body: {
          policyUUIDs: [policyUuid!],
          emails: ['e2e-test@example.com'],
          override: false,
        },
      });
      expect(applyRes.error).toBeUndefined();

      // Get audit trail
      const auditRes = await getPolicyAuditTrail({ client, path: { id: policyUuid! } });
      expect(auditRes.error).toBeUndefined();
      const auditData = auditRes.data;
      if (Array.isArray(auditData)) {
        expect(auditData.length).toBeGreaterThan(0);
      } else {
        expect(auditData).toBeDefined();
      }
    } finally {
      if (policyUuid) {
        await deletePolicy({ client, path: { id: policyUuid } }).catch(() => {});
      }
    }
  });
});
