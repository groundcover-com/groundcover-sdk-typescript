import { describe, expect, it } from 'vitest';
import { createSecret, deleteSecret, getSecretHash, updateSecret } from '../../src/index.js';
import { newTestClient } from './setup.js';

describe('Secrets Lifecycle', () => {
  it('crud secret', async () => {
    await using tc = newTestClient();
    const ts = Date.now();
    const secretName = `sdk-ts-e2e-test-secret-${ts}`;
    const { client } = tc;

    const createRes = await createSecret({
      client,
      body: {
        name: secretName,
        type: 'api_key',
        content: 'test-secret-content',
      },
    });
    expect(createRes.error).toBeUndefined();
    const secretId = createRes.data?.id;
    expect(secretId).toBeDefined();
    tc.trackSecret(secretId!);

    const updateRes = await updateSecret({
      client,
      path: { id: secretId! },
      body: {
        name: secretName,
        type: 'api_key',
        content: 'updated-secret-content',
      },
    });
    expect(updateRes.error).toBeUndefined();

    const hashRes = await getSecretHash({ client, path: { id: secretId! } });
    if (hashRes.error) {
      if (hashRes.response.status !== 404) {
        expect(hashRes.error).toBeUndefined();
      }
    } else {
      expect(hashRes.data?.contentHash).toBeDefined();
    }

    const deleteRes = await deleteSecret({ client, path: { id: secretId! } });
    expect(deleteRes.error).toBeUndefined();
    tc.untrackSecret(secretId!);
  });

  it('secret types', async () => {
    await using tc = newTestClient();
    const { client } = tc;
    const createdIds: string[] = [];

    for (const secretType of ['api_key', 'password', 'basic_auth'] as const) {
      const ts = Date.now();
      const name = `sdk-ts-e2e-test-secret-${ts}-${secretType}`;
      const createRes = await createSecret({
        client,
        body: {
          name,
          type: secretType,
          content: 'test-content',
        },
      });
      expect(createRes.error).toBeUndefined();
      expect(createRes.data?.type).toBe(secretType);
      const id = createRes.data?.id;
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      createdIds.push(id);
      tc.trackSecret(id);
    }

    for (const id of createdIds) {
      const deleteRes = await deleteSecret({ client, path: { id } });
      expect(deleteRes.error).toBeUndefined();
      tc.untrackSecret(id);
    }
  });

  it('create secret with managed provider', async () => {
    await using tc = newTestClient();
    const ts = Date.now();
    const secretName = `sdk-ts-e2e-test-secret-${ts}-terraform`;
    const { client } = tc;

    const createRes = await createSecret({
      client,
      body: {
        name: secretName,
        type: 'api_key',
        content: 'terraform-managed-secret',
        managedByProvider: 'terraform',
      },
    });
    expect(createRes.error).toBeUndefined();
    const createdId = createRes.data?.id!;
    expect(createdId).toBeDefined();
    tc.trackSecret(createdId);

    const deleteRes = await deleteSecret({ client, path: { id: createdId } });
    expect(deleteRes.error).toBeUndefined();
    tc.untrackSecret(createdId);
  });

  it('update nonexistent secret', async () => {
    await using tc = newTestClient();
    const updateRes = await updateSecret({
      client: tc.client,
      path: { id: 'secretRef::store::00000000-0000-0000-0000-000000000000' },
      body: {
        name: 'non-existent',
        type: 'api_key',
        content: 'test',
      },
    });
    expect(updateRes.error).toBeDefined();
  });

  it('delete nonexistent secret', async () => {
    await using tc = newTestClient();
    const deleteRes = await deleteSecret({
      client: tc.client,
      path: { id: 'secretRef::store::00000000-0000-0000-0000-000000000000' },
    });
    expect(deleteRes.error).toBeDefined();
  });

  it('get hash nonexistent secret', async () => {
    await using tc = newTestClient();
    const hashRes = await getSecretHash({
      client: tc.client,
      path: { id: 'secretRef::store::00000000-0000-0000-0000-000000000000' },
    });
    expect(hashRes.error).toBeDefined();
  });
});
