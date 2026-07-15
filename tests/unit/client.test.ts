import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initClient } from '../../src/client.js';

describe('initClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws if apiKey is missing', () => {
    process.env.GC_API_KEY = undefined;
    process.env.GC_BACKEND_ID = 'test-backend';
    expect(() => initClient()).toThrow(/API key is required/);
  });

  it('throws if backendId is missing', () => {
    process.env.GC_API_KEY = 'test-key';
    process.env.GC_BACKEND_ID = undefined;
    expect(() => initClient()).toThrow(/Backend ID is required/);
  });

  it('initializes correctly with explicit config', () => {
    const client = initClient({
      apiKey: 'explicit-key',
      backendId: 'explicit-backend',
      baseUrl: 'http://localhost:8080',
    });

    expect(client).toBeDefined();
    const config = client.getConfig();
    expect(config.baseUrl).toBe('http://localhost:8080');
    const headers = config.headers as Headers;
    expect(headers.get('X-Backend-Id')).toBe('explicit-backend');
    expect(headers.get('Authorization')).toBe('Bearer explicit-key');
  });

  it('initializes correctly with env variables', () => {
    process.env.GC_API_KEY = 'env-key';
    process.env.GC_BACKEND_ID = 'env-backend';
    process.env.GC_BASE_URL = 'http://env.local:8080';

    const client = initClient();
    const config = client.getConfig();
    expect(config.baseUrl).toBe('http://env.local:8080');
    const headers = config.headers as Headers;
    expect(headers.get('X-Backend-Id')).toBe('env-backend');
    expect(headers.get('Authorization')).toBe('Bearer env-key');
  });
});
