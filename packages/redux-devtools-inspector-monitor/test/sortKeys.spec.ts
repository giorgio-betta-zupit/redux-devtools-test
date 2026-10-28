import { getSortObjectKeys } from '../src/utils/sortKeys.js';

const keys = ['zipCode', 'item10', 'Address', 'item2', 'city'];

function sortWith(order: 'asc' | 'desc') {
  const compare = getSortObjectKeys(order);
  if (typeof compare !== 'function') throw new Error('Expected a comparator');
  return [...keys].sort(compare);
}

describe('getSortObjectKeys', () => {
  it('sorts A→Z ignoring case, with numbers in numeric order', () => {
    expect(sortWith('asc')).toEqual([
      'Address',
      'city',
      'item2',
      'item10',
      'zipCode',
    ]);
  });

  it('sorts Z→A', () => {
    expect(sortWith('desc')).toEqual([
      'zipCode',
      'item10',
      'item2',
      'city',
      'Address',
    ]);
  });

  it('keeps the original order otherwise', () => {
    expect(getSortObjectKeys('none')).toBe(false);
  });
});
