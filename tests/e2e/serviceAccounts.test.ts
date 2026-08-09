import { beforeAll, describe, expect, it } from 'vitest';
import {
  createPolicy,
  createServiceAccount,
  deletePolicy,
  deleteServiceAccount,
  initClient,
  listServiceAccounts,
  updateServiceAccount,
} from '../../src/index.js';

async function createTestPolicy(client: ReturnType<typeof initClient>, suffix: string) {
  const policyName = `sdk-ts-e2e-test-policy-for-sa-${suffix}`;
  const policyRes = await createPolicy({
    client,
    body: {
      name: policyName,
      description: 'Policy for SA TS E2E testing',
      role: { write: '' },
      dataScope: {},
    },
  });
  expect(policyRes.error).toBeUndefined();
  return policyRes.data?.uuid!;
}

describe('Service Accounts Lifecycle', () => {
  let client: ReturnType<typeof initClient>;

  beforeAll(() => {
    client = initClient();
  });

  it('crud service account', async () => {
    const ts = Date.now();

    // Create two policies: one for initial assignment, one for update
    const policyUuid = await createTestPolicy(client, `${ts}`);
    const secondPolicyUuid = await createTestPolicy(client, `${ts}-2`);

    try {
      // Create service account
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
      expect(saId).toBeDefined();

      try {
        // List - verify presence
        const listRes = await listServiceAccounts({ client });
        expect(listRes.error).toBeUndefined();
        const serviceAccounts =
          (listRes.data as any)?.serviceAccounts ||
          (listRes.data as any)?.items ||
          (Array.isArray(listRes.data) ? listRes.data : []);
        const found = serviceAccounts.some((sa: any) => sa.serviceAccountId === saId);
        expect(found).toBe(true);

        // Update - change email and add second policy
        const updatedEmail = `sdk-ts-e2e-test-updated-${ts}@groundcover.com`;
        const updateRes = await updateServiceAccount({
          client,
          body: {
            serviceAccountId: saId!,
            email: updatedEmail,
            policyUUIDs: [secondPolicyUuid],
          },
        });
        expect(updateRes.error).toBeUndefined();

        // Verify update via List
        const listUpdatedRes = await listServiceAccounts({ client });
        expect(listUpdatedRes.error).toBeUndefined();
        const updatedServiceAccounts =
          (listUpdatedRes.data as any)?.serviceAccounts ||
          (listUpdatedRes.data as any)?.items ||
          (Array.isArray(listUpdatedRes.data) ? listUpdatedRes.data : []);

        let foundUpdated = false;
        for (const sa of updatedServiceAccounts) {
          if (sa.serviceAccountId === saId) {
            foundUpdated = true;
            expect(sa.email).toBe(updatedEmail);
            const policyUuids = sa.policies?.map((p: any) => p.uuid) || [];
            expect(policyUuids).toContain(secondPolicyUuid);
            break;
          }
        }
        expect(foundUpdated).toBe(true);
      } finally {
        if (saId) {
          await deleteServiceAccount({
            client,
            path: { serviceAccountId: saId },
          }).catch(() => {});
        }
      }
    } finally {
      for (const pid of [policyUuid, secondPolicyUuid]) {
        await deletePolicy({ client, path: { uuid: pid } }).catch(() => {});
      }
    }
  });
});
