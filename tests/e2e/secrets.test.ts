import { beforeAll, describe, expect, it } from 'vitest';
import {
  createSecret,
  deleteSecret,
  getSecretHash,
  initClient,
  updateSecret,
} from '../../src/index.js';

describe('Secrets Lifecycle', () => {
  let client: ReturnType<typeof initClient>;

  beforeAll(() => {
    client = initClient();
  });

  it('crud secret', async () => {
    const ts = Date.now();
    const secretName = `sdk-ts-e2e-test-secret-${ts}`;

    // Create
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
    expect(createRes.data?.name).toBe(secretName);
    expect(createRes.data?.type).toBe('api_key');

    try {
      // Update
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
      expect(updateRes.data?.id).toBe(secretId);

      // Get hash
      const hashRes = await getSecretHash({ client, path: { id: secretId! } });
      if (hashRes.error) {
        // Skip if endpoint not available yet (like in Python)
        if (hashRes.response.status !== 404) {
          expect(hashRes.error).toBeUndefined();
        }
      } else {
        expect(hashRes.data?.id).toBe(secretId);
        expect(hashRes.data?.contentHash).toBeDefined();
      }
    } finally {
      if (secretId) {
        await deleteSecret({ client, path: { id: secretId } }).catch(() => {});
      }
    }
  });

  it('secret types', async () => {
    const createdIds: string[] = [];

    try {
      for (const secretType of ['api_key', 'password', 'basic_auth']) {
        const ts = Date.now();
        const name = `sdk-ts-e2e-test-secret-${ts}-${secretType}`;
        const createRes = await createSecret({
          client,
          body: {
            name,
            type: secretType as any,
            content: 'test-content',
          },
        });
        expect(createRes.error).toBeUndefined();
        expect(createRes.data?.type).toBe(secretType);
        createdIds.push(createRes.data?.id!);
      }
    } finally {
      for (const sid of createdIds) {
        await deleteSecret({ client, path: { id: sid } }).catch(() => {});
      }
    }
  });

  it('create secret with managed provider', async () => {
    const ts = Date.now();
    const secretName = `sdk-ts-e2e-test-secret-${ts}-terraform`;
    let createdId: string | undefined;

    try {
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
      createdId = createRes.data?.id;
      expect(createdId).toBeDefined();
    } finally {
      if (createdId) {
        await deleteSecret({ client, path: { id: createdId } }).catch(() => {});
      }
    }
  });

  it('update nonexistent secret', async () => {
    const updateRes = await updateSecret({
      client,
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
    const deleteRes = await deleteSecret({
      client,
      path: { id: 'secretRef::store::00000000-0000-0000-0000-000000000000' },
    });
    expect(deleteRes.error).toBeDefined();
  });

  it('get hash nonexistent secret', async () => {
    const hashRes = await getSecretHash({
      client,
      path: { id: 'secretRef::store::00000000-0000-0000-0000-000000000000' },
    });
    expect(hashRes.error).toBeDefined();
  });
});
