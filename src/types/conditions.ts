/** Condition constants for the groundcover SDK. */

// Condition fields
export const CONDITION_ORIGIN_ROOT = 'root';

// Condition keys
export const CONDITION_KEY_NAMESPACE = 'namespace';
export const CONDITION_KEY_WORKLOAD = 'workload';
export const CONDITION_KEY_POD_NAME = 'podName';
export const CONDITION_KEY_REASON = 'reason';
export const CONDITION_KEY_TYPE = 'type';
export const CONDITION_KEY_ENV = 'env';
export const CONDITION_KEY_INSTANCE = 'instance';

// Condition values
export const CONDITION_VALUE_OOM_KILLED = 'OOMKilled';
export const CONDITION_VALUE_TYPE_CONTAINER_CRASH = 'container_crash';

// Filter operators
export const OPERATOR_EQUAL = 'eq';
export const OPERATOR_NOT_EQUAL = 'ne';
export const OPERATOR_CONTAINS = 'contains';
export const OPERATOR_NOT_CONTAINS = 'notcontains';
export const OPERATOR_CONTAINS_IGNORE_CASE = 'icontains';
export const OPERATOR_NOT_CONTAINS_IGNORE_CASE = 'inotcontains';
export const OPERATOR_STARTS_WITH = 'startswith';
export const OPERATOR_STARTS_WITH_IGNORE_CASE = 'istartswith';

// Condition types
export const CONDITION_TYPE_STRING = 'string';
export const CONDITION_TYPE_INT64 = 'int64';
export const CONDITION_TYPE_FLOAT64 = 'float64';
export const CONDITION_TYPE_BOOL = 'bool';
export const CONDITION_TYPE_DATETIME = 'datetime';
export const CONDITION_TYPE_STRING_ARRAY = 'string_array';
