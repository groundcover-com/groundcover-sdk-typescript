# groundcover TypeScript SDK

Official TypeScript/JavaScript SDK for the [groundcover](https://groundcover.com) API.

## Requirements

- **Node.js** (>= 18.0.0)
- **Bun** (>= 1.0.0)
- **Deno** (>= 1.37.0)
- A groundcover API key and Backend ID

## Installation

```bash
# npm
npm install @groundcover/api-client

# yarn
yarn add @groundcover/api-client

# pnpm
pnpm add @groundcover/api-client

# bun
bun add @groundcover/api-client

# deno
deno add npm:@groundcover/api-client
```

## Quick Start

```typescript
import { initClient } from '@groundcover/api-client';
import { metricsQuery } from '@groundcover/api-client';

// Initialize the client
// Uses GC_API_KEY and GC_BACKEND_ID from environment by default
const client = initClient();

async function run() {
  const now = new Date();
  const start = new Date(now.getTime() - 60 * 60 * 1000);

  const result = await metricsQuery({
    client,
    body: {
      Promql: 'up',
      QueryType: 'instant',
      Start: start.toISOString(),
      End: now.toISOString(),
      Step: '1m',
    },
  });

  console.log(result.data);
}

run();
```

The SDK provides **typed API functions** as the primary interface.
Import the operation module and call it with the `client`:

```typescript
import { searchLogs } from '@groundcover/api-client';

const result = await searchLogs({
  client,
  body: {
    start: start.toISOString(),
    end: now.toISOString(),
    query: '* | stats count(*)',
  },
});
```

Raw HTTP methods (`client.get()`, `client.post()`, etc.) remain available for
advanced use cases or endpoints not yet available as typed functions.

## Configuration

The SDK reads from environment variables by default:

| Variable | Description | Required |
|---|---|---|
| `GC_API_KEY` | Your groundcover API key | Yes |
| `GC_BACKEND_ID` | Your groundcover Backend ID | Yes |
| `GC_BASE_URL` | API base URL (default: `https://api.groundcover.com`) | No |
| `GC_TRACEPARENT` | Default traceparent header for tracing | No |

You can also pass configuration explicitly:

```typescript
const client = initClient({
  apiKey: 'your-api-key',
  backendId: 'your-backend-id',
  baseUrl: 'https://api.groundcover.com',
  timeout: 60000,
  maxRetries: 5,
});
```

## Monitors (YAML)

Monitor endpoints return YAML content-type. The SDK provides a convenience wrapper `getMonitorParsed` to automatically parse the YAML response into a JavaScript object:

```typescript
import { getMonitorParsed, createMonitor, updateMonitor } from '@groundcover/api-client';

// Fetch and automatically parse YAML to a JS object
const { data: monitorObj, error } = await getMonitorParsed({ client, path: { id: 'monitor-id' } });

// Create or update using standard JS objects
// (Since JSON is a valid subset of YAML, the standard client correctly serializes your object)
await createMonitor({ 
  client, 
  body: { name: 'My Monitor', type: 'logs' } 
});

await updateMonitor({ 
  client, 
  path: { id: 'monitor-id' }, 
  body: updatedMonitorObj 
});
```

## Error Handling

All requests — both typed API calls and raw HTTP methods — return an `error` object inside the result if the request fails:

```typescript
import { getDashboard } from '@groundcover/api-client';

const result = await getDashboard({
  client,
  path: { id: 'nonexistent' }
});

if (result.error) {
  console.error(`API error:`, result.error);
} else {
  console.log(result.data);
}
```

## Retry Behavior

By default, the SDK retries idempotent requests (`GET`, `HEAD`, `OPTIONS`, `TRACE`) on HTTP 429 and 503 with exponential backoff and jitter:

- **Default retries**: 3
- **Default retry statuses**: 429, 503
- **Backoff**: Exponential with jitter, 1s min, 30s max

## Development

```bash
cd sdk-typescript
pnpm install

# Run unit tests
pnpm test:unit

# Run e2e tests
pnpm test:e2e

# Run linting
pnpm lint

# Format code
pnpm format
```

## License

Apache 2.0 — see [LICENSE](LICENSE).