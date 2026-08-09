import * as yaml from 'js-yaml';
import type { Options } from './_generated/client/types.gen.js';
import { getMonitor } from './_generated/index.js';
import type { GetMonitorData } from './_generated/index.js';

export type ParsedMonitorResponse =
  | { data: Record<string, unknown>; error: null; response: Response }
  | { data: undefined; error: unknown; response: Response };

/**
 * Convenience method to get a monitor and parse its YAML response into an object.
 */
export async function getMonitorParsed(
  options: Options<GetMonitorData>,
): Promise<ParsedMonitorResponse> {
  const result = (await getMonitor({
    ...options,
    parseAs: 'text',
  })) as unknown as {
    data?: string;
    error?: unknown;
    response: Response;
  };

  if (result.error || !result.data) {
    return { data: undefined, error: result.error, response: result.response };
  }

  try {
    return {
      data: yaml.load(result.data) as Record<string, unknown>,
      error: null,
      response: result.response,
    };
  } catch (e) {
    return { data: undefined, error: e, response: result.response };
  }
}
