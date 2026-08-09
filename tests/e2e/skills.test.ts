import { describe, expect, it } from 'vitest';
import {
  agentCreateSkill,
  agentDeleteSkill,
  agentGetSkill,
  agentListSkills,
  agentUpdateSkill,
} from '../../src/index.js';
import { newTestClient } from './setup.js';

describe('Skills Lifecycle', () => {
  it('crud skill', async () => {
    await using tc = newTestClient();
    const defaultPrefix = `ts-sdk-e2e-test-skill-${Date.now()}`;
    const createdName = `${defaultPrefix}-created`;
    const updatedName = `${defaultPrefix}-updated`;
    const { client } = tc;

    const createRes = await agentCreateSkill({
      client,
      headers: {
        'User-Agent': 'terraform-provider-groundcover/sdk-e2e',
      },
      body: {
        name: createdName,
        description: 'Created by SDK E2E test',
        when_to_use: 'Use this skill during SDK E2E create checks',
        instructions: 'Do something',
        is_organizational: true,
      },
    });

    expect(createRes.error).toBeUndefined();
    const skillId = createRes.data?.skill?.id || '';
    expect(skillId).not.toBe('');
    tc.trackAgentSkill(skillId);

    const getRes = await agentGetSkill({
      client,
      path: { skill_id: skillId },
    });
    expect(getRes.error).toBeUndefined();
    expect(getRes.data?.skill?.name).toBe(createdName);

    const updateRes = await agentUpdateSkill({
      client,
      path: { skill_id: skillId },
      headers: {
        'User-Agent': 'terraform-provider-groundcover/sdk-e2e',
      },
      body: {
        name: updatedName,
        description: 'Updated by SDK E2E test',
        when_to_use: 'Use this skill during SDK E2E update checks',
        instructions: 'Do something else entirely',
        is_organizational: true,
      },
    });
    expect(updateRes.error).toBeUndefined();
    expect(updateRes.data?.skill?.name).toBe(updatedName);

    const listRes = await agentListSkills({ client });
    expect(listRes.error).toBeUndefined();
    expect(listRes.data?.skills?.some((s) => s.id === skillId)).toBe(true);

    const deleteRes = await agentDeleteSkill({
      client,
      path: { skill_id: skillId },
    });
    expect(deleteRes.error).toBeUndefined();
    tc.untrackAgentSkill(skillId);

    const getDeletedRes = await agentGetSkill({
      client,
      path: { skill_id: skillId },
    });
    expect(getDeletedRes.error).toBeDefined();
    expect(getDeletedRes.response.status).toBe(404);
  });
});
