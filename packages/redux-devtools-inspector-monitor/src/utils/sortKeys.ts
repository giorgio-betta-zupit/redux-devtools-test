import type { SortObjectKeys } from 'react-json-tree';
import type { TreeSortOrder } from '../redux.js';

// Case insensitive, with numbers in numeric order (2 before 10)
const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});
const compareKeys = (a: unknown, b: unknown) =>
  collator.compare(String(a), String(b));
const compareKeysDesc = (a: unknown, b: unknown) => compareKeys(b, a);

export function getSortObjectKeys(order: TreeSortOrder): SortObjectKeys {
  if (order === 'asc') return compareKeys;
  if (order === 'desc') return compareKeysDesc;
  return false;
}
