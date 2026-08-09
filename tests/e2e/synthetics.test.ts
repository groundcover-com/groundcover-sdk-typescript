import { describe, expect, it } from 'vitest';
import {
  createSyntheticTest,
  deleteSyntheticTest,
  getSyntheticTest,
  type initClient,
  listSyntheticTests,
  updateSyntheticTest,
} from '../../src/index.js';
import { newTestClient } from './setup.js';

function expectSyntheticId(data: { id?: string } | undefined): string {
  const id = data?.id;
  expect(typeof id).toBe('string');
  expect(id.length).toBeGreaterThan(0);
  return id;
}

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
      const synthetics = listRes.data?.synthetics ?? [];
      let found = false;

      for (const item of synthetics) {
        if (item.id === syntheticId) {
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
  it('http synthetic crud', async () => {
    await using tc = newTestClient();
    const ts = Date.now();
    const syntheticName = `sdk-ts-e2e-test-http-synthetic-${ts}`;
    const { client } = tc;

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
    const createdId = expectSyntheticId(createRes.data);
    tc.trackSyntheticTest(createdId);

    await pollListForSynthetic(client, createdId, { shouldExist: true });

    const getRes = await getSyntheticTest({ client, path: { id: createdId } });
    expect(getRes.error).toBeUndefined();
    expect(getRes.data?.name).toBe(syntheticName);

    const updatedName = `${syntheticName}-updated`;
    const updateRes = await updateSyntheticTest({
      client,
      path: { id: createdId },
      body: {
        name: updatedName,
        version: 1,
        enabled: true,
        interval: '10m',
        checkConfig: makeHttpCheck(updatedName),
      },
    });
    expect(updateRes.error).toBeUndefined();

    await pollListForSynthetic(client, createdId, {
      shouldExist: true,
      expectedName: updatedName,
    });

    const getUpdatedRes = await getSyntheticTest({ client, path: { id: createdId } });
    expect(getUpdatedRes.error).toBeUndefined();
    const updatedData = getUpdatedRes.data;
    expect(updatedData?.name).toBe(updatedName);
    expect(updatedData?.interval).toBe('10m');
    expect(updatedData?.checkConfig?.kind).toBe('http');
    expect(updatedData?.checkConfig?.request?.http?.method).toBe('GET');
    expect(updatedData?.checkConfig?.request?.http?.url).toBe('https://httpbin.org/get');

    const deleteRes = await deleteSyntheticTest({ client, path: { id: createdId } });
    expect(deleteRes.error).toBeUndefined();
    tc.untrackSyntheticTest(createdId);

    await pollListForSynthetic(client, createdId, { shouldExist: false });
  });

  it('tcp synthetic crud', async () => {
    await using tc = newTestClient();
    const ts = Date.now();
    const syntheticName = `sdk-ts-e2e-test-tcp-synthetic-${ts}`;
    const { client } = tc;

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
    const createdId = expectSyntheticId(createRes.data);
    tc.trackSyntheticTest(createdId);

    const getRes = await getSyntheticTest({ client, path: { id: createdId } });
    expect(getRes.error).toBeUndefined();
    const getData = getRes.data;
    expect(getData?.name).toBe(syntheticName);
    expect(getData?.checkConfig?.kind).toBe('tcp');
    expect(getData?.checkConfig?.request?.tcp?.host).toBe('google.com');
    expect(getData?.checkConfig?.request?.tcp?.port).toBe(80);

    const deleteRes = await deleteSyntheticTest({ client, path: { id: createdId } });
    expect(deleteRes.error).toBeUndefined();
    tc.untrackSyntheticTest(createdId);

    await pollListForSynthetic(client, createdId, { shouldExist: false });
  });

  it('ssl synthetic crud', async () => {
    await using tc = newTestClient();
    const ts = Date.now();
    const syntheticName = `sdk-ts-e2e-test-ssl-synthetic-${ts}`;
    const { client } = tc;

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
    const createdId = expectSyntheticId(createRes.data);
    tc.trackSyntheticTest(createdId);

    const getRes = await getSyntheticTest({ client, path: { id: createdId } });
    expect(getRes.error).toBeUndefined();
    const getData = getRes.data;
    expect(getData?.name).toBe(syntheticName);
    expect(getData?.checkConfig?.kind).toBe('ssl');
    expect(getData?.checkConfig?.request?.ssl?.host).toBe('google.com');
    expect(getData?.checkConfig?.request?.ssl?.port).toBe(443);

    const deleteRes = await deleteSyntheticTest({ client, path: { id: createdId } });
    expect(deleteRes.error).toBeUndefined();
    tc.untrackSyntheticTest(createdId);

    await pollListForSynthetic(client, createdId, { shouldExist: false });
  });

  it('dns synthetic crud', async () => {
    await using tc = newTestClient();
    const ts = Date.now();
    const syntheticName = `sdk-ts-e2e-test-dns-synthetic-${ts}`;
    const { client } = tc;

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
    const createdId = expectSyntheticId(createRes.data);
    tc.trackSyntheticTest(createdId);

    const getRes = await getSyntheticTest({ client, path: { id: createdId } });
    expect(getRes.error).toBeUndefined();
    const getData = getRes.data;
    expect(getData?.name).toBe(syntheticName);
    expect(getData?.checkConfig?.kind).toBe('dns');
    expect(getData?.checkConfig?.request?.dns?.domain).toBe('google.com');
    expect(getData?.checkConfig?.request?.dns?.resolver).toBe('8.8.8.8');
    expect(getData?.checkConfig?.request?.dns?.port).toBe(53);
    expect(getData?.checkConfig?.request?.dns?.recordType).toBe('A');

    const deleteRes = await deleteSyntheticTest({ client, path: { id: createdId } });
    expect(deleteRes.error).toBeUndefined();
    tc.untrackSyntheticTest(createdId);

    await pollListForSynthetic(client, createdId, { shouldExist: false });
  });
});
