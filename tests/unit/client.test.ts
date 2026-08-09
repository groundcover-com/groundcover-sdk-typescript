import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initClient } from '../../src/client.js';
import { getMonitorParsed } from '../../src/helpers.js';

describe('client.ts Transport', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Configuration & Header Injection', () => {
    it('throws if apiKey is missing and not allowUnauthenticated', () => {
      process.env.GC_API_KEY = undefined;
      process.env.GC_BACKEND_ID = 'test-backend';
      expect(() => initClient()).toThrow(/API key is required/);
    });

    it('throws if backendId is missing and not allowUnauthenticated', () => {
      process.env.GC_API_KEY = 'test-key';
      process.env.GC_BACKEND_ID = undefined;
      expect(() => initClient()).toThrow(/Backend ID is required/);
    });

    it('injects Auth, Backend ID, and Traceparent headers', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response('OK'));

      const client = initClient({
        apiKey: 'explicit-key',
        backendId: 'explicit-backend',
        baseUrl: 'http://localhost:8080',
        traceparent: '00-defaulttrace-defaultspan-01',
        fetch: mockFetch,
      });

      const config = client.getConfig();
      expect(config.baseUrl).toBe('http://localhost:8080');

      // The base config should have the headers
      const headers = config.headers as Headers;
      expect(headers.get('X-Backend-Id')).toBe('explicit-backend');
      expect(headers.get('Authorization')).toBe('Bearer explicit-key');
      expect(headers.get('traceparent')).toBe('00-defaulttrace-defaultspan-01');

      // Do a simple request to verify the fetch gets them
      await client.request({ method: 'GET', url: '/test' });
      expect(mockFetch).toHaveBeenCalled();
      const req = mockFetch.mock.calls[0][0] as Request;
      expect(req.headers.get('Authorization')).toBe('Bearer explicit-key');
      expect(req.headers.get('X-Backend-Id')).toBe('explicit-backend');
      expect(req.headers.get('traceparent')).toBe('00-defaulttrace-defaultspan-01');
    });

    it('allows unauthenticated requests', async () => {
      const client = initClient({
        allowUnauthenticated: true,
        baseUrl: 'http://localhost:8080',
      });
      const headers = client.getConfig().headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
      expect(headers.get('X-Backend-Id')).toBeNull();
    });
  });

  describe('Retry Behavior', () => {
    it('retries idempotent requests on 503 and 429', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount < 3) {
          return new Response('Unavailable', { status: 503 });
        }
        return new Response('OK', { status: 200 });
      });

      const client = initClient({
        apiKey: 'test',
        backendId: 'test',
        fetch: mockFetch,
        maxRetries: 3,
        minRetryWait: 1, // Make tests fast
        maxRetryWait: 2,
      });

      const res = (await client.request({ method: 'GET', url: '/api/dashboards' })) as any;
      expect(callCount).toBe(3);
      expect(res.response.status).toBe(200);
    });

    it('falls back to default retry statuses when retryStatuses is empty', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount < 2) {
          return new Response('Too Many Requests', { status: 429 });
        }
        return new Response('OK', { status: 200 });
      });

      const client = initClient({
        apiKey: 'test',
        backendId: 'test',
        fetch: mockFetch,
        retryStatuses: [],
        maxRetries: 2,
        minRetryWait: 1,
        maxRetryWait: 2,
      });

      const res = (await client.request({ method: 'GET', url: '/api/dashboards' })) as any;
      expect(callCount).toBe(2);
      expect(res.response.status).toBe(200);
    });

    it('does not retry 400 bad request', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        callCount++;
        return new Response('Bad Request', { status: 400 });
      });

      const client = initClient({
        apiKey: 'test',
        backendId: 'test',
        fetch: mockFetch,
        maxRetries: 3,
        minRetryWait: 1,
      });

      const res = (await client.request({ method: 'GET', url: '/api/dashboards' })) as any;
      expect(callCount).toBe(1); // Only called once
      expect(res.response.status).toBe(400);
    });

    it('does not retry non-idempotent requests (POST) on 503', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        callCount++;
        return new Response('Unavailable', { status: 503 });
      });

      const client = initClient({
        apiKey: 'test',
        backendId: 'test',
        fetch: mockFetch,
        maxRetries: 3,
        minRetryWait: 1,
      });

      const res = (await client.request({ method: 'POST', url: '/api/dashboards' })) as any;
      expect(callCount).toBe(1); // Only called once
      expect(res.response.status).toBe(503);
    });

    it('returns the last response after exhausting retries', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        callCount++;
        return new Response('Unavailable', { status: 503 });
      });

      const client = initClient({
        apiKey: 'test',
        backendId: 'test',
        fetch: mockFetch,
        maxRetries: 2, // 1 initial + 2 retries
        minRetryWait: 1,
      });

      const res = (await client.request({ method: 'GET', url: '/api/dashboards' })) as any;
      expect(callCount).toBe(3);
      expect(res.response.status).toBe(503);
    });

    it('aborts when timeout is exceeded', async () => {
      const mockFetch = vi.fn().mockImplementation(async (req, init) => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (init.signal?.aborted) {
              reject(new Error(init.signal.reason || 'aborted'));
            } else {
              resolve(new Response('OK'));
            }
          }, 50); // Simulate slow request
        });
      });

      const client = initClient({
        apiKey: 'test',
        backendId: 'test',
        fetch: mockFetch,
        timeout: 10, // Timeout very fast
        maxRetries: 0, // No retries for this test
      });

      const res = (await client.request({ method: 'GET', url: '/api/dashboards' })) as any;
      expect(res.error).toBeDefined();
      expect(res.error.message).toMatch(/Timeout|aborted/);
    });
  });

  describe('Content-Type Fixes', () => {
    it('fixes content-type to application/x-yaml for monitor GET by id', async () => {
      // Mock returns text/html instead of yaml
      const mockFetch = vi.fn().mockResolvedValue(
        new Response('title: "my-monitor"\nseverity: "critical"', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }),
      );
      const client = initClient({ apiKey: 't', backendId: 'b', fetch: mockFetch });

      // We hit a path that triggers the monitor YAML override
      const res = await getMonitorParsed({ client, path: { id: 'abc1234' } });

      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect((res.data as any).title).toBe('my-monitor');
      expect(res.response.headers.get('Content-Type')).toBe('application/x-yaml');
    });

    it('does not fix content-type for monitor silences', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response('{"silences": []}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const client = initClient({ apiKey: 't', backendId: 'b', fetch: mockFetch });

      const res = (await client.request({ method: 'GET', url: '/api/monitors/silences' })) as any;

      expect(res.response.headers.get('Content-Type')).toBe('application/json');
    });

    it('does not fix content-type on POST requests', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response('{}', {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const client = initClient({ apiKey: 't', backendId: 'b', fetch: mockFetch });

      const res = (await client.request({ method: 'POST', url: '/api/monitors' })) as any;
      expect(res.response.headers.get('Content-Type')).toBe('application/json');
    });
  });
});
