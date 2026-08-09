import { describe, expect, it } from 'vitest';
import { ConditionSet } from '../../src/utils/ConditionSet.js';

describe('ConditionSet', () => {
  it('builds conditions correctly with inferred types', () => {
    const conditions = new ConditionSet()
      .add('string_key', 'some_string')
      .add('bool_key', true)
      .add('int_key', 42)
      .add('float_key', 3.14)
      .add('date_key', new Date('2023-01-01T00:00:00Z'))
      .add('array_key', ['a', 'b'])
      .build();

    expect(conditions).toHaveLength(6);

    expect(conditions[0]).toMatchObject({
      key: 'string_key',
      type: 'string',
      filters: [{ value: 'some_string' }],
    });

    expect(conditions[1]).toMatchObject({
      key: 'bool_key',
      type: 'bool',
      filters: [{ value: 'true' }],
    });

    expect(conditions[2]).toMatchObject({
      key: 'int_key',
      type: 'int64',
      filters: [{ value: '42' }],
    });

    expect(conditions[3]).toMatchObject({
      key: 'float_key',
      type: 'float64',
      filters: [{ value: '3.14' }],
    });

    expect(conditions[4]).toMatchObject({
      key: 'date_key',
      type: 'datetime',
      filters: [{ value: '2023-01-01T00:00:00.000Z' }],
    });

    expect(conditions[5]).toMatchObject({
      key: 'array_key',
      type: 'string_array',
      filters: [{ value: '["a","b"]' }],
    });
  });

  it('adds OOM event conditions', () => {
    const conditions = new ConditionSet().addOomEventConditions().build();

    expect(conditions).toHaveLength(2);

    expect(conditions[0]).toMatchObject({
      key: 'reason',
      type: 'string',
      filters: [{ value: 'OOMKilled', op: 'eq' }],
    });

    expect(conditions[1]).toMatchObject({
      key: 'type',
      type: 'string',
      filters: [{ value: 'container_crash', op: 'eq' }],
    });
  });

  it('allows full explicit condition definitions', () => {
    const conditions = new ConditionSet()
      .addFull('my_key', 'my_origin', 'int64', '100', 'ne')
      .build();

    expect(conditions).toHaveLength(1);
    expect(conditions[0]).toEqual({
      key: 'my_key',
      origin: 'my_origin',
      type: 'int64',
      filters: [{ op: 'ne', value: '100' }],
    });
  });
});
