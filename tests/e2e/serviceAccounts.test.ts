import { describe, expect, it } from 'vitest';
import {
  createPolicy,
  createServiceAccount,
  deletePolicy,
  deleteServiceAccount,
  listServiceAccounts,
  updateServiceAccount,
} from '../../src/index.js';
import { type TestClient, newTestClient } from './setup.js';

async function createTestPolicy(tc: TestClient, suffix: string) {
  const policyName = `sdk-ts-e2e-test-policy-for-sa-${suffix}`;
  const policyRes = await createPolicy({
    client: tc.client,
    body: {
      name: policyName,
      description: 'Policy for SA TS E2E testing',
      role: { write: '' },
      dataScope: {},
    },
  });
  expect(policyRes.error).toBeUndefined();
  const policyUuid = policyRes.data?.uuid!;
  expect(policyUuid).toBeDefined();
  tc.trackPolicy(policyUuid);
  return policyUuid;
}

function expectServiceAccountList(data: unknown) {
  expect(Array.isArray(data)).toBe(true);
  return data as NonNullable<Awaited<ReturnType<typeof listServiceAccounts>>['data']>;
}

describe('Service Accounts Lifecycle', () => {
  it('crud service account', async () => {
    await using tc = newTestClient();
    const ts = Date.now();
    const { client } = tc;

    const policyUuid = await createTestPolicy(tc, `${ts}`);
    const secondPolicyUuid = await createTestPolicy(tc, `${ts}-2`);

    const saName = `sdk-ts-e2e-test-sa-${ts}`;
    const saEmail = `sdk-ts-e2e-test-${ts}@groundcover.com`;
    const saRes = await createServiceAccount({
      client,
      body: {
        name: saName,
        email: saEmail,
        policyUUIDs: [policyUuid],
      },
    });
    expect(saRes.error).toBeUndefined();
    const saId = saRes.data?.serviceAccountId;
    expect(typeof saId).toBe('string');
    expect(saId!.length).toBeGreaterThan(0);
    tc.trackServiceAccount(saId!);

    const listRes = await listServiceAccounts({ client });
    expect(listRes.error).toBeUndefined();
    const serviceAccounts = expectServiceAccountList(listRes.data);
    expect(serviceAccounts.some((sa) => sa.serviceAccountId === saId)).toBe(true);

    const updatedEmail = `sdk-ts-e2e-test-updated-${ts}@groundcover.com`;
    const updateRes = await updateServiceAccount({
      client,
      body: {
        serviceAccountId: saId!,
        email: updatedEmail,
        policyUUIDs: [secondPolicyUuid],
        overridePolicies: false,
      },
    });
    expect(updateRes.error).toBeUndefined();

    const listUpdatedRes = await listServiceAccounts({ client });
    expect(listUpdatedRes.error).toBeUndefined();
    const updatedServiceAccounts = expectServiceAccountList(listUpdatedRes.data);

    const updated = updatedServiceAccounts.find((sa) => sa.serviceAccountId === saId);
    expect(updated).toBeDefined();
    expect(updated?.email).toBe(updatedEmail);
    const policyUuids = updated?.policies?.map((p) => p.uuid) ?? [];
    expect(policyUuids).toContain(policyUuid);
    expect(policyUuids).toContain(secondPolicyUuid);

    const deleteSaRes = await deleteServiceAccount({
      client,
      path: { id: saId! },
    });
    expect(deleteSaRes.error).toBeUndefined();
    tc.untrackServiceAccount(saId!);

    for (const pid of [policyUuid, secondPolicyUuid]) {
      const deletePolicyRes = await deletePolicy({ client, path: { id: pid } });
      expect(deletePolicyRes.error).toBeUndefined();
      tc.untrackPolicy(pid);
    }
  });
});
