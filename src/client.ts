import pRetry, { AbortError } from 'p-retry';
import { createClient } from './_generated/client/index.js';

export interface GroundcoverConfig {
  /**
   * The API Key for the groundcover backend.
   * If not provided, it will fallback to the GC_API_KEY environment variable.
   */
  apiKey?: string;

  /**
   * The Backend ID (tenant ID) for your environment.
   * If not provided, it will fallback to the GC_BACKEND_ID environment variable.
   */
  backendId?: string;

  /**
   * The Base URL of the groundcover API.
   * Defaults to 'https://api.groundcover.com' or the GC_BASE_URL environment variable.
   */
  baseUrl?: string;
  /**
   * Maximum number of automatic retries on failure (default: 3).
   */
  maxRetries?: number;

  /**
   * Request timeout in milliseconds (default: 30000).
   */
  timeout?: number;

  /**
   * Custom fetch implementation to use instead of the global fetch.
   */
  fetch?: typeof fetch;

  /**
   * Minimum wait time between retries in milliseconds (default: 1000).
   */
  minRetryWait?: number;

  /**
   * Maximum wait time between retries in milliseconds (default: 30000).
   */
  maxRetryWait?: number;

  /**
   * Array of HTTP status codes that trigger a retry (default: [408, 429, 500, 502, 503, 504]).
   */
  retryStatuses?: number[];

  /**
   * Default traceparent header to include in all requests.
   * Can also be set via the GC_TRACEPARENT environment variable.
   */
  traceparent?: string;
}

class RetryableResponseError extends Error {
  constructor(public response: Response) {
    super(`Retryable status code: ${response.status}`);
    this.name = 'RetryableResponseError';
  }
}

/**
 * Initializes and returns a new groundcover SDK client.
 * Must be called before using any API services.
 *
 * @param config - Optional configuration object.
 */
function normalizeBaseUrl(baseUrl: string): string {
  if (!baseUrl) return '';
  if (baseUrl.startsWith('//')) return `https:${baseUrl}`;
  if (baseUrl.startsWith('/') && !baseUrl.startsWith('//'))
    return `https://${baseUrl.replace(/^\/+/, '')}`;
  if (!baseUrl.includes('://')) return `https://${baseUrl}`;
  return baseUrl;
}

// @ts-ignore - Deno global might not be in the default typings
declare const Deno: { env: { get(key: string): string | undefined } } | undefined;

function getEnvVar(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  if (typeof Deno !== 'undefined' && Deno.env) {
    return Deno.env.get(key);
  }
  return undefined;
}

export function initClient(config?: GroundcoverConfig) {
  const apiKey = config?.apiKey || getEnvVar('GC_API_KEY');
  const backendId = config?.backendId || getEnvVar('GC_BACKEND_ID');
  const rawBaseUrl = config?.baseUrl || getEnvVar('GC_BASE_URL') || 'https://api.groundcover.com';
  const baseUrl = normalizeBaseUrl(rawBaseUrl);
  const maxRetries = config?.maxRetries ?? 3;
  const traceparent = config?.traceparent || getEnvVar('GC_TRACEPARENT');
  const timeout = config?.timeout ?? 30000;
  const activeFetch = config?.fetch ?? globalThis.fetch;
  const retryStatuses = config?.retryStatuses ?? [408, 429, 500, 502, 503, 504];

  if (!apiKey) {
    throw new Error(
      'groundcover API key is required. Pass it via config or set GC_API_KEY environment variable.',
    );
  }

  if (!backendId) {
    throw new Error(
      'groundcover Backend ID is required. Pass it via config or set GC_BACKEND_ID environment variable.',
    );
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'X-Backend-Id': backendId,
    'User-Agent': 'groundcover-ts-sdk',
  };

  if (traceparent) {
    headers.traceparent = traceparent;
  }

  const client = createClient({
    baseUrl,
    headers,
    // Override fetch to add retries and content-type fixes
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      // Create the base Request once. If input is already a Request, we clone it
      // so we don't consume the caller's instance. If it's a URL/string, we construct it.
      const baseReq = input instanceof Request ? input.clone() : new Request(input, init);

      // Fix content-type for workflows/create on the base request
      if (baseReq.method === 'POST' && baseReq.url.endsWith('/api/workflows/create')) {
        baseReq.headers.set('Content-Type', 'text/plain');
      }

      const runFetch = async () => {
        // Clone for each attempt so the body isn't consumed
        const req = baseReq.clone();

        let res: Response;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(new Error('Timeout')), timeout);
          const signal = req.signal
            ? AbortSignal.any([req.signal, controller.signal])
            : controller.signal;

          try {
            res = await activeFetch(req, { signal });
          } finally {
            clearTimeout(timeoutId);
          }
        } catch (err) {
          // Convert network/TypeError fetch failures to a non-retryable AbortError by default
          // Only retry if explicitly intended: idempotent methods or requests with Idempotency-Key
          const isIdempotentMethod = ['GET', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'].includes(
            req.method.toUpperCase(),
          );
          const hasIdempotencyKey = req.headers.has('Idempotency-Key');

          if (isIdempotentMethod || hasIdempotencyKey) {
            throw err; // Allow p-retry to handle it
          }

          throw new AbortError(err as Error);
        }

        // Fix response content-type for monitor YAML GETs
        if (req.method === 'GET' && res.status === 200) {
          const url = new URL(req.url);
          const path = url.pathname.replace(/\/$/, '');
          const parts = path.split('/');
          // /api/monitors/{id}
          if (parts.length >= 4 && parts[parts.length - 2] === 'monitors') {
            const segment = parts[parts.length - 1];
            if (!['silences', 'list', 'recurring-silences'].includes(segment)) {
              const contentType = res.headers.get('content-type') || '';
              if (!contentType.startsWith('application/x-yaml')) {
                // To mutate headers we need to reconstruct the response
                const newHeaders = new Headers(res.headers);
                newHeaders.set('content-type', 'application/x-yaml');
                return new Response(res.body, {
                  status: res.status,
                  statusText: res.statusText,
                  headers: newHeaders,
                });
              }
            }
          }
        }

        // Trigger retry on certain status codes
        if (retryStatuses.includes(res.status)) {
          // Do not retry non-idempotent requests (like POST/PATCH) unless they have an idempotency key
          if (
            ['POST', 'PATCH'].includes(req.method.toUpperCase()) &&
            !req.headers.has('Idempotency-Key')
          ) {
            return res;
          }
          throw new RetryableResponseError(res);
        }

        // Also don't retry on other status codes
        return res;
      };

      try {
        return await pRetry(runFetch, {
          retries: maxRetries,
          minTimeout: config?.minRetryWait ?? 1000,
          maxTimeout: config?.maxRetryWait ?? 30000,
          factor: 2,
          randomize: true,
        });
      } catch (err) {
        if (err instanceof RetryableResponseError) {
          return err.response; // return the final response after exhaustion
        }
        throw err;
      }
    },
  });

  // Interceptor to clean up Content-Type and add retries (matching Go/Python SDKs)
  client.interceptors.request.use((req, options) => {
    // For GET/DELETE/HEAD requests, avoid sending a Content-Type.
    if (['GET', 'DELETE', 'HEAD'].includes(req.method.toUpperCase())) {
      req.headers.delete('Content-Type');
    }

    return req;
  });

  return client;
}
