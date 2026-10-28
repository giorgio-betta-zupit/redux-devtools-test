type Key = string | number;
type Container = Record<Key, unknown> | unknown[];

export interface FilterTreeOptions {
  /** Also match primitive values, not only keys. */
  searchValues?: boolean;
  /** Applied to every value before it's traversed (eg. to normalize diff deltas). */
  postprocessValue?: (value: unknown) => unknown;
  /** Values that should be treated as leaves even if they are objects or arrays. */
  isCustomNode?: (value: unknown) => boolean;
  /** Text matched against the query when `searchValues` is enabled. */
  valueToString?: (value: unknown) => string | undefined;
}

export interface FilterTreeResult {
  data: unknown;
  /** `undefined` when no filtering was applied. */
  matchCount: number | undefined;
  /** Ids (see `getPathId`) of the nodes leading to a match. */
  expandedPaths: Set<string>;
}

const NO_MATCH = Symbol('NO_MATCH');
const identity = (value: unknown) => value;
const noCustomNode = () => false;

export function getPathId(path: readonly Key[]) {
  return JSON.stringify(path.map(String));
}

function isPlainObject(value: unknown): value is Record<Key, unknown> {
  return (
    Object.prototype.toString.call(value) === '[object Object]' &&
    typeof (value as Record<symbol, unknown>)[Symbol.iterator] !== 'function'
  );
}

export function primitiveToString(value: unknown) {
  if (
    value === null ||
    (typeof value !== 'object' && typeof value !== 'function')
  ) {
    return String(value);
  }
  return undefined;
}

/**
 * Returns a copy of `data` containing only the keys (or values) matching `query`,
 * along with their ancestors. Arrays with matches become objects keyed by the
 * original indexes, so labels and pinned paths still point to the right item.
 */
export function filterTree(
  data: unknown,
  query: string,
  {
    searchValues = false,
    postprocessValue = identity,
    isCustomNode = noCustomNode,
    valueToString = primitiveToString,
  }: FilterTreeOptions = {},
): FilterTreeResult {
  const needle = query.trim().toLowerCase();
  const expandedPaths = new Set<string>();
  const ancestors = new Set<unknown>();
  const root = postprocessValue(data);
  let matchCount = 0;

  const isTraversable = (value: unknown): value is Container =>
    (Array.isArray(value) || isPlainObject(value)) &&
    !isCustomNode(value) &&
    !ancestors.has(value);

  const matches = (text: string | undefined) =>
    text !== undefined && text.toLowerCase().includes(needle);

  function filterValue(key: Key, value: unknown, path: Key[]): unknown {
    if (matches(String(key))) {
      matchCount++;
      return value;
    }
    if (isTraversable(value)) {
      return filterChildren(value, [...path, key]);
    }
    if (searchValues && matches(valueToString(value))) {
      matchCount++;
      return value;
    }
    return NO_MATCH;
  }

  function filterChildren(container: Container, path: Key[]): unknown {
    const result: Record<Key | symbol, unknown> = {};
    let hasMatch = false;

    ancestors.add(container);
    const keys: Key[] = Array.isArray(container)
      ? container.map((_, idx) => idx)
      : Object.getOwnPropertyNames(container);
    for (const key of keys) {
      const value = postprocessValue((container as Record<Key, unknown>)[key]);
      const filtered = filterValue(key, value, path);
      if (filtered !== NO_MATCH) {
        result[key] = filtered;
        hasMatch = true;
      }
    }
    ancestors.delete(container);

    if (!hasMatch) return NO_MATCH;

    // Keep symbol keys around, they hold metadata such as the serialized data type
    for (const symbol of Object.getOwnPropertySymbols(container)) {
      result[symbol] = (container as Record<symbol, unknown>)[symbol];
    }
    if (path.length) expandedPaths.add(getPathId(path));
    return result;
  }

  if (!needle || !isTraversable(root)) {
    return { data, matchCount: undefined, expandedPaths };
  }

  const filtered = filterChildren(root, []);
  return {
    data: filtered === NO_MATCH ? undefined : filtered,
    matchCount,
    expandedPaths,
  };
}
