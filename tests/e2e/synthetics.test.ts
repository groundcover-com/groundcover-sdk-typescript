import { beforeAll, describe, expect, it } from 'vitest';
import {
  createSyntheticTest,
  deleteSyntheticTest,
  getSyntheticTest,
  initClient,
  listSyntheticTests,
  updateSyntheticTest,
} from '../../src/index.js';

async function pollListForSynthetic(
  client: ReturnType<typeof initClient>,
  syntheticId: string,
  options: {
    shouldExist?: boolean;
    expectedName?: string;
    timeoutMs?: number;
    intervalMs?: number;
  } = {},
) {
  const { shouldExist = true, expectedName, timeoutMs = 120000, intervalMs = 2000 } = options;
  const start = Date.now();
  let lastError = '';

  while (Date.now() - start < timeoutMs) {
    const listRes = await listSyntheticTests({ client });
    if (!listRes.error) {
      const data = listRes.data as any;
      const synthetics = data?.synthetics || data?.items || (Array.isArray(data) ? data : []);
      let found = false;

      for (const item of synthetics) {
        if (item.id === syntheticId || item.uuid === syntheticId) {
          if (expectedName !== undefined && item.name !== expectedName) {
            continue;
          }
          found = true;
          break;
        }
      }

      if (found === shouldExist) {
        return;
      }
      lastError = `synthetic ${syntheticId} ${shouldExist ? 'not found' : 'still present'} in list`;
    } else {
      lastError = `list failed: ${JSON.stringify(listRes.error)}`;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out: ${lastError}`);
}

function makeHttpCheck(name: string) {
  return {
    kind: 'http' as const,
    metadata: { syntheticName: name },
    request: {
      http: {
        kind: 'http' as const,
        method: 'GET',
        url: 'https://httpbin.org/get',
        timeout: '30s',
      },
    },
    executionPolicy: {
      assertions: [{ source: 'statusCode', operator: 'eq', target: '200' }],
    },
    tracing: {},
  };
}

describe('Synthetics Lifecycle', () => {
  let client: ReturnType<typeof initClient>;

  beforeAll(() => {
    client = initClient();
  });

  it('http synthetic crud', async () => {
    const ts = Date.now();
    const syntheticName = `sdk-ts-e2e-test-http-synthetic-${ts}`;
    let createdId: string | undefined;

    try {
      // Create
      const createRes = await createSyntheticTest({
        client,
        body: {
          name: syntheticName,
          version: 1,
          enabled: true,
          interval: '5m',
          checkConfig: makeHttpCheck(syntheticName),
        },
      });
      expect(createRes.error).toBeUndefined();
      createdId = (createRes.data as any)?.id || (createRes.data as any)?.uuid;
      expect(createdId).toBeDefined();

      // List - poll until visible
      await pollListForSynthetic(client, createdId!, { shouldExist: true });

      // Get
      const getRes = await getSyntheticTest({ client, path: { id: createdId! } });
      expect(getRes.error).toBeUndefined();
      expect((getRes.data as any)?.name).toBe(syntheticName);

      // Update - change name and interval
      const updatedName = `${syntheticName}-updated`;
      const updateRes = await updateSyntheticTest({
        client,
        path: { id: createdId! },
        body: {
          name: updatedName,
          version: 1,
          enabled: true,
          interval: '10m',
          checkConfig: makeHttpCheck(updatedName),
        },
      });
      expect(updateRes.error).toBeUndefined();

      // Poll list until updated name visible
      await pollListForSynthetic(client, createdId!, {
        shouldExist: true,
        expectedName: updatedName,
      });

      // Verify update via Get
      const getUpdatedRes = await getSyntheticTest({ client, path: { id: createdId! } });
      expect(getUpdatedRes.error).toBeUndefined();
      const updatedData = getUpdatedRes.data as any;
      expect(updatedData.name).toBe(updatedName);
      expect(updatedData.interval).toBe('10m');
      expect(updatedData.checkConfig?.kind).toBe('http');
      expect(updatedData.checkConfig?.request?.http?.method).toBe('GET');
      expect(updatedData.checkConfig?.request?.http?.url).toBe('https://httpbin.org/get');

      // Delete
      const deleteRes = await deleteSyntheticTest({ client, path: { id: createdId! } });
      expect(deleteRes.error).toBeUndefined();

      // Poll until removed
      await pollListForSynthetic(client, createdId!, { shouldExist: false });
      createdId = undefined;
    } finally {
      if (createdId) {
        await deleteSyntheticTest({ client, path: { id: createdId } }).catch(() => {});
      }
    }
  });

  it('tcp synthetic crud', async () => {
    const ts = Date.now();
    const syntheticName = `sdk-ts-e2e-test-tcp-synthetic-${ts}`;
    let createdId: string | undefined;

    try {
      // Create
      const createRes = await createSyntheticTest({
        client,
        body: {
          name: syntheticName,
          version: 1,
          enabled: true,
          interval: '5m',
          checkConfig: {
            kind: 'tcp',
            metadata: { syntheticName },
            request: {
              tcp: {
                kind: 'tcp',
                host: 'google.com',
                port: 80,
              },
            },
            executionPolicy: {
              assertions: [{ source: 'tcp', operator: 'exists', target: 'true' }],
            },
            tracing: {},
          },
        },
      });
      expect(createRes.error).toBeUndefined();
      createdId = (createRes.data as any)?.id || (createRes.data as any)?.uuid;
      expect(createdId).toBeDefined();

      // Get - verify TCP config
      const getRes = await getSyntheticTest({ client, path: { id: createdId! } });
      expect(getRes.error).toBeUndefined();
      const getData = getRes.data as any;
      expect(getData.name).toBe(syntheticName);
      expect(getData.checkConfig?.kind).toBe('tcp');
      expect(getData.checkConfig?.request?.tcp?.host).toBe('google.com');
      expect(getData.checkConfig?.request?.tcp?.port).toBe(80);

      // Delete
      const deleteRes = await deleteSyntheticTest({ client, path: { id: createdId! } });
      expect(deleteRes.error).toBeUndefined();
      createdId = undefined;
    } finally {
      if (createdId) {
        await deleteSyntheticTest({ client, path: { id: createdId } }).catch(() => {});
      }
    }
  });

  it('ssl synthetic crud', async () => {
    const ts = Date.now();
    const syntheticName = `sdk-ts-e2e-test-ssl-synthetic-${ts}`;
    let createdId: string | undefined;

    try {
      // Create
      const createRes = await createSyntheticTest({
        client,
        body: {
          name: syntheticName,
          version: 1,
          enabled: true,
          interval: '5m',
          checkConfig: {
            kind: 'ssl',
            metadata: { syntheticName },
            request: {
              ssl: {
                kind: 'ssl',
                host: 'google.com',
                port: 443,
              },
            },
            executionPolicy: {
              assertions: [{ source: 'ssl', operator: 'exists', target: 'true' }],
            },
            tracing: {},
          },
        },
      });
      expect(createRes.error).toBeUndefined();
      createdId = (createRes.data as any)?.id || (createRes.data as any)?.uuid;
      expect(createdId).toBeDefined();

      // Get - verify SSL config
      const getRes = await getSyntheticTest({ client, path: { id: createdId! } });
      expect(getRes.error).toBeUndefined();
      const getData = getRes.data as any;
      expect(getData.name).toBe(syntheticName);
      expect(getData.checkConfig?.kind).toBe('ssl');
      expect(getData.checkConfig?.request?.ssl?.host).toBe('google.com');
      expect(getData.checkConfig?.request?.ssl?.port).toBe(443);

      // Delete
      const deleteRes = await deleteSyntheticTest({ client, path: { id: createdId! } });
      expect(deleteRes.error).toBeUndefined();
      createdId = undefined;
    } finally {
      if (createdId) {
        await deleteSyntheticTest({ client, path: { id: createdId } }).catch(() => {});
      }
    }
  });

  it('dns synthetic crud', async () => {
    const ts = Date.now();
    const syntheticName = `sdk-ts-e2e-test-dns-synthetic-${ts}`;
    let createdId: string | undefined;

    try {
      // Create
      const createRes = await createSyntheticTest({
        client,
        body: {
          name: syntheticName,
          version: 1,
          enabled: true,
          interval: '5m',
          checkConfig: {
            kind: 'dns',
            metadata: { syntheticName },
            request: {
              dns: {
                kind: 'dns',
                domain: 'google.com',
                resolver: '8.8.8.8',
                port: 53,
                recordType: 'A',
                timeout: '30s',
              },
            },
            executionPolicy: {
              assertions: [{ source: 'dnsAnswer', operator: 'exists', target: 'true' }],
            },
            tracing: {},
          },
        },
      });
      expect(createRes.error).toBeUndefined();
      createdId = (createRes.data as any)?.id || (createRes.data as any)?.uuid;
      expect(createdId).toBeDefined();

      // Get - verify DNS config
      const getRes = await getSyntheticTest({ client, path: { id: createdId! } });
      expect(getRes.error).toBeUndefined();
      const getData = getRes.data as any;
      expect(getData.name).toBe(syntheticName);
      expect(getData.checkConfig?.kind).toBe('dns');
      expect(getData.checkConfig?.request?.dns?.domain).toBe('google.com');
      expect(getData.checkConfig?.request?.dns?.resolver).toBe('8.8.8.8');
      expect(getData.checkConfig?.request?.dns?.port).toBe(53);
      expect(getData.checkConfig?.request?.dns?.recordType).toBe('A');

      // Delete
      const deleteRes = await deleteSyntheticTest({ client, path: { id: createdId! } });
      expect(deleteRes.error).toBeUndefined();
      createdId = undefined;
    } finally {
      if (createdId) {
        await deleteSyntheticTest({ client, path: { id: createdId } }).catch(() => {});
      }
    }
  });
});
