import { filterTree, getPathId } from '../src/utils/filterTree.js';
import { diffFilterOptions } from '../src/tabs/JSONDiff.js';

const state = {
  user: {
    firstName: 'Ada',
    lastName: 'Lovelace',
    address: { city: 'London', zipCode: 'NW1' },
  },
  orders: [
    { id: 1, product: 'Engine' },
    { id: 2, product: 'Loom', shippingAddress: { city: 'Paris' } },
  ],
  settings: { theme: 'dark' },
};

describe('filterTree', () => {
  it('returns the data untouched without a query', () => {
    const result = filterTree(state, '  ');
    expect(result.data).toBe(state);
    expect(result.matchCount).toBeUndefined();
  });

  it('keeps matching keys and their ancestors only', () => {
    const result = filterTree(state, 'city');
    expect(result.data).toEqual({
      user: { address: { city: 'London' } },
      orders: { 1: { shippingAddress: { city: 'Paris' } } },
    });
    expect(result.matchCount).toBe(2);
  });

  it('is case insensitive and keeps the whole subtree of a matching key', () => {
    const result = filterTree(state, 'ADDRESS');
    expect(result.data).toEqual({
      user: { address: state.user.address },
      orders: { 1: { shippingAddress: { city: 'Paris' } } },
    });
    expect(result.matchCount).toBe(2);
  });

  it('marks the ancestors of the matches as expanded', () => {
    const { expandedPaths } = filterTree(state, 'city');
    expect([...expandedPaths].sort()).toEqual(
      [
        ['user'],
        ['user', 'address'],
        ['orders'],
        ['orders', 1],
        ['orders', 1, 'shippingAddress'],
      ]
        .map(getPathId)
        .sort(),
    );
  });

  it('matches values only when asked to', () => {
    expect(filterTree(state, 'paris').matchCount).toBe(0);

    const result = filterTree(state, 'paris', { searchValues: true });
    expect(result.data).toEqual({
      orders: { 1: { shippingAddress: { city: 'Paris' } } },
    });
    expect(result.matchCount).toBe(1);
  });

  it('matches numbers, booleans and nulls by value', () => {
    const data = { a: 42, b: true, c: null, d: 'x' };
    const options = { searchValues: true };
    expect(filterTree(data, '42', options).data).toEqual({ a: 42 });
    expect(filterTree(data, 'true', options).data).toEqual({ b: true });
    expect(filterTree(data, 'null', options).data).toEqual({ c: null });
  });

  it('returns no data when nothing matches', () => {
    const result = filterTree(state, 'nope');
    expect(result.data).toBeUndefined();
    expect(result.matchCount).toBe(0);
  });

  it('keeps symbol keys of the containers holding a match', () => {
    const typeKey = Symbol.for('__serializedType__');
    const data = { map: { [typeKey]: 'ImmutableMap', data: { foo: 1 } } };
    const result = filterTree(data, 'foo') as { data: typeof data };
    expect(result.data.map[typeKey]).toBe('ImmutableMap');
  });

  it('does not loop on circular references', () => {
    const data: Record<string, unknown> = { name: 'root' };
    data.self = data;
    const result = filterTree(data, 'name');
    expect(result.data).toEqual({ name: 'root' });
    expect(result.matchCount).toBe(1);
  });

  it('does not filter primitive roots', () => {
    expect(filterTree(42, '4').matchCount).toBeUndefined();
    expect(filterTree(undefined, 'a').matchCount).toBeUndefined();
  });
});

describe('filterTree with diff deltas', () => {
  const delta = {
    user: { firstName: ['Ada', 'Augusta'] },
    orders: {
      _t: 'a',
      2: [{ id: 3, product: 'Calculator' }],
      _0: [{ id: 1, product: 'Engine' }, 0, 0],
    },
  };

  it('treats changes as leaves and arrays as objects', () => {
    const result = filterTree(delta, 'firstname', diffFilterOptions);
    expect(result.data).toEqual({ user: { firstName: ['Ada', 'Augusta'] } });

    const byIndex = filterTree(delta, '2', diffFilterOptions);
    expect(byIndex.data).toEqual({
      orders: { 2: [{ id: 3, product: 'Calculator' }] },
    });
  });

  it('matches the old and new values', () => {
    const options = { ...diffFilterOptions, searchValues: true };
    expect(filterTree(delta, 'augusta', options).data).toEqual({
      user: { firstName: ['Ada', 'Augusta'] },
    });
    expect(filterTree(delta, 'calculator', options).matchCount).toBe(1);
    expect(filterTree(delta, 'engine', options).data).toEqual({
      orders: { 0: [{ id: 1, product: 'Engine' }, 0, 0] },
    });
  });

  it('does not filter equal states', () => {
    expect(
      filterTree(false, 'a', diffFilterOptions).matchCount,
    ).toBeUndefined();
  });
});
