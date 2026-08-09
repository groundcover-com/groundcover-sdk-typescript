import {
  CONDITION_KEY_REASON,
  CONDITION_KEY_TYPE,
  CONDITION_ORIGIN_ROOT,
  CONDITION_TYPE_BOOL,
  CONDITION_TYPE_DATETIME,
  CONDITION_TYPE_FLOAT64,
  CONDITION_TYPE_INT64,
  CONDITION_TYPE_STRING,
  CONDITION_TYPE_STRING_ARRAY,
  CONDITION_VALUE_OOM_KILLED,
  CONDITION_VALUE_TYPE_CONTAINER_CRASH,
  OPERATOR_EQUAL,
} from '../types/conditions.js';

import type { Condition } from '../_generated/index.js';

/**
 * Fluent builder for constructing a list of conditions.
 *
 * Uses default values for origin, type, and operator which can be overridden.
 *
 * Example:
 * ```typescript
 * import { ConditionSet } from '@groundcover/api-client';
 *
 * const conditions = new ConditionSet()
 *   .add("namespace", "production")
 *   .add("reason", "OOMKilled")
 *   .addOomEventConditions()
 *   .build();
 * ```
 */
export class ConditionSet {
  private conditions: Condition[] = [];
  private defaultOrigin: string;
  private defaultCondType: string;
  private defaultOperator: string;

  constructor(
    defaultOrigin: string = CONDITION_ORIGIN_ROOT,
    defaultCondType: string = CONDITION_TYPE_STRING,
    defaultOperator: string = OPERATOR_EQUAL,
  ) {
    this.defaultOrigin = defaultOrigin;
    this.defaultCondType = defaultCondType;
    this.defaultOperator = defaultOperator;
  }

  /**
   * Add a condition, inferring the type from the JavaScript value type.
   *
   * Supports: string, string[], number (int/float inferred heuristically), boolean, Date.
   */
  add(key: string, value: unknown): ConditionSet {
    const [valueStr, condType] = this.inferType(value);
    return this.addInternal(key, this.defaultOrigin, condType, valueStr, this.defaultOperator);
  }

  /** Add a condition with explicit origin, type, operator, and value. */
  addFull(
    key: string,
    origin: string,
    condType: string,
    value: string,
    operator: string,
  ): ConditionSet {
    return this.addInternal(key, origin, condType, value, operator);
  }

  /** Add a pre-constructed condition object directly. */
  addRaw(condition: Condition): ConditionSet {
    this.conditions.push(condition);
    return this;
  }

  /**
   * Add predefined conditions to identify OOM events.
   * Adds reason=OOMKilled and type=container_crash.
   */
  addOomEventConditions(): ConditionSet {
    this.add(CONDITION_KEY_REASON, CONDITION_VALUE_OOM_KILLED);
    this.add(CONDITION_KEY_TYPE, CONDITION_VALUE_TYPE_CONTAINER_CRASH);
    return this;
  }

  /** Return the final list of condition objects. */
  build(): Condition[] {
    return [...this.conditions];
  }

  private addInternal(
    key: string,
    origin: string,
    condType: string,
    value: string,
    operator: string,
  ): ConditionSet {
    const condition: Condition = {
      key,
      origin,
      type: condType,
      filters: [{ op: operator, value }],
    };
    this.conditions.push(condition);
    return this;
  }

  /**
   * Infer condition type and string value from a JavaScript value.
   * Returns [valueStr, condType].
   */
  private inferType(value: unknown): [string, string] {
    if (typeof value === 'string') {
      return [value, CONDITION_TYPE_STRING];
    }
    if (typeof value === 'boolean') {
      return [String(value).toLowerCase(), CONDITION_TYPE_BOOL];
    }
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return [String(value), CONDITION_TYPE_INT64];
      }
      return [String(value), CONDITION_TYPE_FLOAT64];
    }
    if (value instanceof Date) {
      return [value.toISOString(), CONDITION_TYPE_DATETIME];
    }
    if (Array.isArray(value)) {
      return [JSON.stringify(value), CONDITION_TYPE_STRING_ARRAY];
    }
    // Fallback
    return [String(value), this.defaultCondType];
  }
}
