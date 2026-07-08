# groundcover TypeScript SDK

Official TypeScript SDK for the [groundcover](https://groundcover.com) API.

## Installation

You can install the SDK using your preferred package manager:

```bash
# Using npm
npm install @groundcover/sdk

# Using pnpm
pnpm add @groundcover/sdk

# Using yarn
yarn add @groundcover/sdk
```

## Requirements

- Node.js 18+ (Fetch API support required)
- A groundcover API key and Backend ID

## Quick Start

Initialize the client with your credentials (or rely on environment variables), and then call the typed functions from the generated API:

```typescript
import { initClient, listDashboards } from '@groundcover/sdk';

// Initialize the SDK Client
initClient();

// Call an endpoint using the generated API function
async function run() {
  const { data, error, response } = await listDashboards();
  
  if (error) {
    console.error('Error fetching dashboards:', error);
    return;
  }
  
  console.log('Dashboards:', data);
}

run();
```

## Configuration

The SDK reads from environment variables by default:

| Variable | Description | Required |
|---|---|---|
| `GC_API_KEY` | Your groundcover API key | Yes |
| `GC_BACKEND_ID` | Your groundcover Backend ID | Yes |
| `GC_BASE_URL` | API base URL (default: `https://api.groundcover.com`) | No |

You can also pass configuration explicitly during initialization:

```typescript
import { initClient } from '@groundcover/sdk';

const client = initClient({
  apiKey: "your-api-key",
  backendId: "your-backend-id",
  baseUrl: "https://api.groundcover.com",
});
```

## API Structure

The SDK provides strongly-typed API functions and schemas generated directly from the groundcover OpenAPI specification using `@hey-api/openapi-ts`.

All endpoints are exported as individual functions. They return an object containing `data`, `error`, and `response`.

```typescript
import { createApiKey, deleteApiKey } from '@groundcover/sdk';

// Creating a resource
const { data: newApiKey, error } = await createApiKey({
  body: {
    name: 'my-new-api-key',
    description: 'Created via SDK',
    serviceAccountId: 'your-sa-id'
  }
});

// Deleting a resource
await deleteApiKey({
  path: {
    id: newApiKey.id
  }
});
```

## License

Apache 2.0 — see [LICENSE](LICENSE).
