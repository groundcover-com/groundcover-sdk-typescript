import {
  agentDeleteSkill,
  deleteApiKey,
  deleteDashboard,
  deleteDataIntegrationConfig,
  deleteIngestionKey,
  deleteMonitor,
  deletePolicy,
  deleteSecret,
  deleteServiceAccount,
  deleteSilence,
  deleteSyntheticTest,
  initClient,
} from '../../src/index.js';

type Client = ReturnType<typeof initClient>;

type DeleteResult = {
  error?: unknown;
  response: { status: number };
};

function isNotFoundDeleteStatus(status: number): boolean {
  return status === 404;
}

async function assertDeleteSucceeded(
  result: DeleteResult,
  resource: TrackedResource,
): Promise<void> {
  if (!result.error) {
    return;
  }
  if (isNotFoundDeleteStatus(result.response.status)) {
    return;
  }
  throw new Error(
    `Cleanup failed to delete ${resource.kind} ${resource.id}: ${JSON.stringify(result.error)}`,
  );
}

export async function pollUntil<T>({
  fn,
  predicate,
  timeoutMs = 30_000,
  intervalMs = 1_000,
  label = 'condition',
}: {
  fn: () => Promise<T>;
  predicate: (value: T) => boolean;
  timeoutMs?: number;
  intervalMs?: number;
  label?: string;
}): Promise<T> {
  const start = Date.now();
  let lastValue: T | undefined;

  while (Date.now() - start < timeoutMs) {
    lastValue = await fn();
    if (predicate(lastValue)) {
      return lastValue;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out waiting for ${label}`);
}

type ResourceKind =
  | 'dashboard'
  | 'monitor'
  | 'silence'
  | 'policy'
  | 'synthetic test'
  | 'ingestion key'
  | 'data integration config'
  | 'secret'
  | 'agent skill'
  | 'service account'
  | 'api key';

interface TrackedResource {
  kind: ResourceKind;
  id: string;
  subtype?: string;
}

export interface TestClientOptions {
  apiKey?: string;
  backendId?: string;
  baseUrl?: string;
}

/**
 * E2E test harness mirroring sdk/tests/e2e/setup.go.
 * Track resources after create; scope with `await using tc = newTestClient()` for automatic cleanup.
 */
export class TestClient {
  readonly client: Client;
  private tracked: TrackedResource[] = [];

  constructor(options?: TestClientOptions) {
    this.client = initClient(options);
  }

  trackDashboard(id: string): void {
    this.track({ kind: 'dashboard', id });
  }

  untrackDashboard(id: string): void {
    this.untrack({ kind: 'dashboard', id });
  }

  trackMonitor(id: string): void {
    this.track({ kind: 'monitor', id });
  }

  untrackMonitor(id: string): void {
    this.untrack({ kind: 'monitor', id });
  }

  trackSilence(id: string): void {
    this.track({ kind: 'silence', id });
  }

  untrackSilence(id: string): void {
    this.untrack({ kind: 'silence', id });
  }

  trackPolicy(id: string): void {
    this.track({ kind: 'policy', id });
  }

  untrackPolicy(id: string): void {
    this.untrack({ kind: 'policy', id });
  }

  trackSyntheticTest(id: string): void {
    this.track({ kind: 'synthetic test', id });
  }

  untrackSyntheticTest(id: string): void {
    this.untrack({ kind: 'synthetic test', id });
  }

  /** Ingestion keys are tracked and deleted by key name. */
  trackIngestionKey(name: string): void {
    this.track({ kind: 'ingestion key', id: name });
  }

  untrackIngestionKey(name: string): void {
    this.untrack({ kind: 'ingestion key', id: name });
  }

  trackDataIntegrationConfig(integrationType: string, id: string): void {
    this.track({ kind: 'data integration config', id, subtype: integrationType });
  }

  untrackDataIntegrationConfig(integrationType: string, id: string): void {
    this.untrack({ kind: 'data integration config', id, subtype: integrationType });
  }

  trackSecret(id: string): void {
    this.track({ kind: 'secret', id });
  }

  untrackSecret(id: string): void {
    this.untrack({ kind: 'secret', id });
  }

  trackAgentSkill(id: string): void {
    this.track({ kind: 'agent skill', id });
  }

  untrackAgentSkill(id: string): void {
    this.untrack({ kind: 'agent skill', id });
  }

  trackServiceAccount(id: string): void {
    this.track({ kind: 'service account', id });
  }

  untrackServiceAccount(id: string): void {
    this.untrack({ kind: 'service account', id });
  }

  trackApiKey(id: string): void {
    this.track({ kind: 'api key', id });
  }

  untrackApiKey(id: string): void {
    this.untrack({ kind: 'api key', id });
  }

  /** Deletes all tracked resources not explicitly untracked by the test. */
  async cleanup(): Promise<void> {
    const resources = this.tracked;
    this.tracked = [];
    const failures: Error[] = [];

    for (const resource of [...resources].reverse()) {
      try {
        await this.deleteResource(resource);
        if (process.env.SDK_DEBUG) {
          console.log(`Cleanup: deleted leftover ${resource.kind} ${resource.id}`);
        }
      } catch (err) {
        failures.push(err instanceof Error ? err : new Error(String(err)));
        console.warn(`Cleanup: failed to delete ${resource.kind} ${resource.id}:`, err);
      }
    }

    if (failures.length > 0) {
      throw new AggregateError(failures, 'TestClient cleanup failed');
    }
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.cleanup();
  }

  private track(resource: TrackedResource): void {
    if (
      this.tracked.some(
        (tracked) =>
          tracked.kind === resource.kind &&
          tracked.id === resource.id &&
          tracked.subtype === resource.subtype,
      )
    ) {
      return;
    }
    this.tracked.push(resource);
  }

  private untrack(resource: TrackedResource): void {
    const index = this.tracked.findIndex(
      (tracked) =>
        tracked.kind === resource.kind &&
        tracked.id === resource.id &&
        tracked.subtype === resource.subtype,
    );
    if (index >= 0) {
      this.tracked.splice(index, 1);
    }
  }

  private async deleteResource(resource: TrackedResource): Promise<void> {
    const { client } = this;

    switch (resource.kind) {
      case 'dashboard':
        await assertDeleteSucceeded(
          await deleteDashboard({ client, path: { id: resource.id } }),
          resource,
        );
        return;
      case 'monitor':
        await assertDeleteSucceeded(
          await deleteMonitor({ client, path: { id: resource.id } }),
          resource,
        );
        return;
      case 'silence':
        await assertDeleteSucceeded(
          await deleteSilence({ client, path: { id: resource.id } }),
          resource,
        );
        return;
      case 'policy':
        await assertDeleteSucceeded(
          await deletePolicy({ client, path: { id: resource.id } }),
          resource,
        );
        return;
      case 'synthetic test':
        await assertDeleteSucceeded(
          await deleteSyntheticTest({ client, path: { id: resource.id } }),
          resource,
        );
        return;
      case 'ingestion key':
        await assertDeleteSucceeded(
          await deleteIngestionKey({ client, body: { name: resource.id } }),
          resource,
        );
        return;
      case 'data integration config':
        await assertDeleteSucceeded(
          await deleteDataIntegrationConfig({
            client,
            path: { type: resource.subtype!, id: resource.id },
          }),
          resource,
        );
        return;
      case 'secret':
        await assertDeleteSucceeded(
          await deleteSecret({ client, path: { id: resource.id } }),
          resource,
        );
        return;
      case 'agent skill':
        await assertDeleteSucceeded(
          await agentDeleteSkill({ client, path: { skill_id: resource.id } }),
          resource,
        );
        return;
      case 'service account':
        await assertDeleteSucceeded(
          await deleteServiceAccount({ client, path: { id: resource.id } }),
          resource,
        );
        return;
      case 'api key':
        await assertDeleteSucceeded(
          await deleteApiKey({ client, path: { id: resource.id } }),
          resource,
        );
        return;
      default: {
        const _exhaustive: never = resource.kind;
        throw new Error(`unknown tracked resource kind ${_exhaustive}`);
      }
    }
  }
}

export function newTestClient(options?: TestClientOptions): TestClient {
  return new TestClient(options);
}
