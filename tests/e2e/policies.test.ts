import { describe, expect, it } from 'vitest';
import {
  applyPolicy,
  createPolicy,
  deletePolicy,
  getPolicy,
  getPolicyAuditTrail,
  listPolicies,
  updatePolicy,
} from '../../src/index.js';
import { newTestClient } from './setup.js';

describe('Policies Lifecycle', () => {
  it('crud policy', async () => {
    await using tc = newTestClient();
    const ts = Date.now();
    const policyName = `sdk-ts-e2e-test-policy-${ts}`;
    const { client } = tc;

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
    tc.trackPolicy(policyUuid!);

    const listRes = await listPolicies({ client });
    expect(listRes.error).toBeUndefined();
    expect(Array.isArray(listRes.data)).toBe(true);
    expect(listRes.data!.some((p) => p.uuid === policyUuid)).toBe(true);

    const getRes = await getPolicy({ client, path: { id: policyUuid! } });
    expect(getRes.error).toBeUndefined();
    expect(getRes.data?.uuid).toBe(policyUuid);
    expect(getRes.data?.name).toBe(policyName);

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

    const getUpdatedRes = await getPolicy({ client, path: { id: policyUuid! } });
    expect(getUpdatedRes.error).toBeUndefined();
    expect(getUpdatedRes.data?.description).toBe(updatedDesc);

    const applyRes = await applyPolicy({
      client,
      body: {
        policyUUIDs: [policyUuid!],
        emails: ['e2e-test@example.com'],
        override: false,
      },
    });
    expect(applyRes.error).toBeUndefined();

    const auditRes = await getPolicyAuditTrail({ client, path: { id: policyUuid! } });
    expect(auditRes.error).toBeUndefined();

    const deleteRes = await deletePolicy({ client, path: { id: policyUuid! } });
    expect(deleteRes.error).toBeUndefined();
    tc.untrackPolicy(policyUuid!);
  });
});
