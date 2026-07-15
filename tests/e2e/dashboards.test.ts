import { beforeAll, describe, expect, it } from 'vitest';
import {
  archiveDashboard,
  createDashboard,
  deleteDashboard,
  getDashboard,
  getDashboards,
  initClient,
  restoreDashboard,
  updateDashboard,
} from '../../src/index.js';

const DASHBOARD_PRESET = JSON.stringify({
  duration: 'Last 30 minutes',
  layout: [
    { id: 'A', x: 0, y: 0, w: 4, h: 3, minH: 2 },
    { id: 'B', x: 0, y: 3, w: 4, h: 3, minH: 1 },
  ],
  widgets: [
    {
      id: 'A',
      type: 'widget',
      name: 'avg(groundcover_node_rt_disk_space_used_percent{})',
      queries: [
        {
          id: 'A',
          expr: 'avg(groundcover_node_rt_disk_space_used_percent{})',
          dataType: 'metrics',
          step: null,
          editorMode: 'builder',
        },
      ],
      visualizationConfig: { type: 'time-series' },
    },
    { id: 'B', type: 'text', html: '<p>SDK Test Widget</p>' },
  ],
  variables: {},
  schemaVersion: 3,
});

const UPDATED_PRESET = JSON.stringify({
  duration: 'Last 1 hour',
  layout: [
    { id: 'A', x: 0, y: 0, w: 6, h: 4, minH: 2 },
    { id: 'B', x: 0, y: 4, w: 6, h: 2, minH: 1 },
  ],
  widgets: [
    {
      id: 'A',
      type: 'widget',
      name: 'Updated: avg(groundcover_node_rt_disk_space_used_percent{})',
      queries: [
        {
          id: 'A',
          expr: 'avg(groundcover_node_rt_disk_space_used_percent{})',
          dataType: 'metrics',
          step: null,
          editorMode: 'builder',
        },
      ],
      visualizationConfig: { type: 'time-series' },
    },
    { id: 'B', type: 'text', html: '<p>Updated SDK Test Widget</p>' },
  ],
  variables: {},
  schemaVersion: 3,
});

async function findDashboard(client: ReturnType<typeof initClient>, id: string) {
  const listRes = await getDashboards({ client });
  if (listRes.error) return null;
  const dashboards =
    (listRes.data as any)?.dashboards ||
    (listRes.data as any)?.items ||
    (Array.isArray(listRes.data) ? listRes.data : []);
  return dashboards.find((d: any) => d.uuid === id) || null;
}

describe('Dashboards Lifecycle', () => {
  let client: ReturnType<typeof initClient>;

  beforeAll(() => {
    client = initClient();
  });

  it('crud dashboard', async () => {
    const ts = Date.now();
    const dashboardTitle = `sdk-ts-e2e-test-dashboard-${ts}`;

    let dashboardId: string | undefined;

    try {
      // Create
      const createRes = await createDashboard({
        client,
        body: {
          name: dashboardTitle,
          description: 'Created by TS SDK E2E test',
          preset: DASHBOARD_PRESET,
        },
      });
      expect(createRes.error).toBeUndefined();
      dashboardId = createRes.data?.uuid;
      expect(dashboardId).toBeDefined();

      const createdRevision = createRes.data?.revisionNumber ?? 1;

      // Find in list
      const created = await findDashboard(client, dashboardId!);
      expect(created).toBeDefined();
      expect(created.name).toBe(dashboardTitle);
      expect(created.status).toBe('active');

      // Get
      const getRes = await getDashboard({ client, path: { id: dashboardId! } });
      expect(getRes.error).toBeUndefined();
      expect(getRes.data?.name).toBe(dashboardTitle);

      // Update
      const updatedName = `${dashboardTitle}-updated`;
      const updateRes = await updateDashboard({
        client,
        path: { id: dashboardId! },
        body: {
          name: updatedName,
          description: 'Updated dashboard description',
          preset: UPDATED_PRESET,
          currentRevision: createdRevision,
          override: false,
        },
      });
      expect(updateRes.error).toBeUndefined();

      const updated = await findDashboard(client, dashboardId!);
      expect(updated).toBeDefined();
      expect(updated.name).toBe(updatedName);
      expect(updated.revisionNumber).toBeGreaterThan(createdRevision);

      // Archive
      const archiveRes = await archiveDashboard({
        client,
        path: { id: dashboardId! },
        query: { currentRevision: updated.revisionNumber },
      });
      expect(archiveRes.error).toBeUndefined();

      const archived = await findDashboard(client, dashboardId!);
      expect(archived).toBeDefined();
      expect(archived.status).toBe('archived');

      // Restore
      const restoreRes = await restoreDashboard({
        client,
        path: { id: dashboardId! },
        query: { currentRevision: archived.revisionNumber },
      });
      expect(restoreRes.error).toBeUndefined();

      const restored = await findDashboard(client, dashboardId!);
      expect(restored).toBeDefined();
      expect(restored.status).toBe('active');
    } finally {
      if (dashboardId) {
        // Cleanup runs for all relevant failures
        await deleteDashboard({
          client,
          path: { id: dashboardId },
        }).catch(() => {});
      }
    }

    // Verify deleted
    if (dashboardId) {
      const deleted = await findDashboard(client, dashboardId);
      expect(deleted).toBeNull();
    }
  });
});
