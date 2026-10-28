import React, { Fragment, useMemo } from 'react';
import type {
  ShouldExpandNodeInitially,
  SortObjectKeys,
  ValueRenderer,
} from 'react-json-tree';
import { DevtoolsInspectorState } from '../redux.js';
import { filterTree, getPathId } from '../utils/filterTree.js';
import type { FilterTreeOptions } from '../utils/filterTree.js';
import highlightMatches from '../utils/highlightMatches.js';
import { getSortObjectKeys } from '../utils/sortKeys.js';
import TreeToolbar from './TreeToolbar.js';

export interface SearchableTreeRenderProps {
  data: unknown;
  sortObjectKeys: SortObjectKeys;
  /** Only set while filtering, expands the nodes leading to a match. */
  shouldExpandNodeInitially: ShouldExpandNodeInitially | undefined;
  /** Only set while filtering values, highlights the matches. */
  valueRenderer: ValueRenderer | undefined;
}

interface Props {
  data: unknown;
  monitorState: DevtoolsInspectorState;
  updateMonitorState: (monitorState: Partial<DevtoolsInspectorState>) => void;
  sortByDefault?: boolean;
  /** Should be a stable reference, the tree is filtered again when it changes. */
  filterOptions?: Omit<FilterTreeOptions, 'searchValues'>;
  children: (props: SearchableTreeRenderProps) => React.ReactNode;
}

export default function SearchableTree({
  data,
  monitorState,
  updateMonitorState,
  sortByDefault = false,
  filterOptions,
  children,
}: Props) {
  const {
    treeSearchValue = '',
    treeSearchInValues = false,
    treeSortOrder = sortByDefault ? 'asc' : 'none',
  } = monitorState;

  const {
    data: filteredData,
    matchCount,
    expandedPaths,
  } = useMemo(
    () =>
      filterTree(data, treeSearchValue, {
        ...filterOptions,
        searchValues: treeSearchInValues,
      }),
    [data, treeSearchValue, treeSearchInValues, filterOptions],
  );
  const isFiltered = matchCount !== undefined;

  const shouldExpandNodeInitially = useMemo<
    ShouldExpandNodeInitially | undefined
  >(
    () =>
      isFiltered
        ? (keyPath) => expandedPaths.has(getPathId([...keyPath].reverse()))
        : undefined,
    [isFiltered, expandedPaths],
  );

  const valueRenderer = useMemo<ValueRenderer | undefined>(
    () =>
      isFiltered && treeSearchInValues
        ? (raw) =>
            typeof raw === 'string'
              ? highlightMatches(raw, treeSearchValue)
              : (raw as React.ReactNode)
        : undefined,
    [isFiltered, treeSearchInValues, treeSearchValue],
  );

  return (
    <>
      <TreeToolbar
        searchValue={treeSearchValue}
        searchInValues={treeSearchInValues}
        sortOrder={treeSortOrder}
        matchCount={matchCount}
        updateMonitorState={updateMonitorState}
      />
      {matchCount === 0 ? (
        <div
          css={(theme) => ({
            padding: '10px',
            color: theme.TEXT_PLACEHOLDER_COLOR,
          })}
        >
          (no matches)
        </div>
      ) : (
        // Remount on a new search, nodes only read `shouldExpandNodeInitially` when mounted
        <Fragment key={`${treeSearchValue}|${treeSearchInValues}`}>
          {children({
            data: filteredData,
            sortObjectKeys: getSortObjectKeys(treeSortOrder),
            shouldExpandNodeInitially,
            valueRenderer,
          })}
        </Fragment>
      )}
    </>
  );
}
