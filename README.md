# @groundcover/api-client

The official groundcover TypeScript API Client.

### Supported Runtimes
- **Node.js** (>= 20.3.0)
- **Bun** (>= 1.0.0)

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
```

## Usage

```typescript
import { initClient, getDashboards } from '@groundcover/api-client';

// Initialize the client
// Uses GC_API_KEY and GC_BACKEND_ID from environment by default
const client = initClient();

// Call an API
const response = await getDashboards({ client });
console.log(response.data);
```
