import React, { useEffect, useMemo, useState } from 'react';
import type { Interpolation, Theme } from '@emotion/react';
import debounce from 'lodash.debounce';
import { DevtoolsInspectorState, TreeSortOrder } from '../redux.js';
import {
  selectorButtonCss,
  selectorButtonSmallCss,
} from '../utils/selectorButtonStyles.js';

const toggleCss: Interpolation<Theme> = [
  selectorButtonCss,
  selectorButtonSmallCss,
  (theme) => ({
    fontFamily: 'inherit',
    color: theme.TEXT_PLACEHOLDER_COLOR,
  }),
];

// Stays filled while hovered, otherwise a click shows no change until the mouse moves away
const toggleOnCss: Interpolation<Theme> = (theme) => ({
  color: theme.BACKGROUND_COLOR,
  backgroundColor: theme.TOGGLE_ON_COLOR,
  borderColor: theme.TOGGLE_ON_COLOR,

  '&:hover': {
    backgroundColor: theme.TOGGLE_ON_COLOR,
    opacity: 0.85,
  },
});

const NEXT_SORT_ORDER: Record<TreeSortOrder, TreeSortOrder> = {
  none: 'asc',
  asc: 'desc',
  desc: 'none',
};

const SORT_TITLES: Record<TreeSortOrder, string> = {
  none: 'Keys in their original order, click to sort them A→Z',
  asc: 'Keys sorted A→Z, click to sort them Z→A',
  desc: 'Keys sorted Z→A, click to restore their original order',
};

interface Props {
  searchValue: string;
  searchInValues: boolean;
  sortOrder: TreeSortOrder;
  matchCount: number | undefined;
  updateMonitorState: (monitorState: Partial<DevtoolsInspectorState>) => void;
}

export default function TreeToolbar({
  searchValue,
  searchInValues,
  sortOrder,
  matchCount,
  updateMonitorState,
}: Props) {
  const [value, setValue] = useState(searchValue);
  const [prevSearchValue, setPrevSearchValue] = useState(searchValue);
  if (searchValue !== prevSearchValue) {
    // The search was changed from elsewhere, eg. flushed by another tab
    setPrevSearchValue(searchValue);
    setValue(searchValue);
  }

  // Filtering big trees on every keystroke is expensive, wait for a pause
  const commitSearch = useMemo(
    () =>
      debounce(
        (treeSearchValue: string) => updateMonitorState({ treeSearchValue }),
        200,
      ),
    [updateMonitorState],
  );

  useEffect(
    () => () => {
      commitSearch.flush();
    },
    [commitSearch],
  );

  const clearSearch = () => {
    commitSearch.cancel();
    setValue('');
    updateMonitorState({ treeSearchValue: '' });
  };

  return (
    <div
      css={(theme) => ({
        position: 'sticky',
        top: 0,
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 10px',
        borderBottomWidth: '1px',
        borderBottomStyle: 'solid',

        backgroundColor: theme.BACKGROUND_COLOR,
        borderColor: theme.LIST_BORDER_COLOR,
      })}
    >
      <input
        type="search"
        aria-label="Filter tree"
        css={(theme) => ({
          flex: 1,
          minWidth: 0,
          outline: 'none',
          border: 'none',
          padding: '2px 0',
          fontSize: '1em',
          fontFamily: 'inherit',

          backgroundColor: theme.BACKGROUND_COLOR,
          color: theme.TEXT_COLOR,

          '&::placeholder': {
            color: theme.TEXT_PLACEHOLDER_COLOR,
          },
        })}
        placeholder={
          searchInValues ? 'filter keys and values...' : 'filter keys...'
        }
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          commitSearch(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') clearSearch();
        }}
      />
      {matchCount !== undefined && (
        <span
          css={(theme) => ({
            whiteSpace: 'nowrap',
            color: theme.TEXT_PLACEHOLDER_COLOR,
          })}
        >
          {matchCount === 1 ? '1 match' : `${matchCount} matches`}
        </span>
      )}
      <div css={{ display: 'inline-flex' }}>
        <button
          type="button"
          aria-pressed={searchInValues}
          title={
            searchInValues
              ? 'Matching keys and values, click to match keys only'
              : 'Matching keys only, click to also match values'
          }
          css={[toggleCss, searchInValues && toggleOnCss]}
          onClick={() =>
            updateMonitorState({ treeSearchInValues: !searchInValues })
          }
        >
          Values
        </button>
        <button
          type="button"
          aria-pressed={sortOrder !== 'none'}
          title={SORT_TITLES[sortOrder]}
          css={[toggleCss, sortOrder !== 'none' && toggleOnCss]}
          onClick={() =>
            updateMonitorState({ treeSortOrder: NEXT_SORT_ORDER[sortOrder] })
          }
        >
          {sortOrder === 'desc' ? 'Z→A' : 'A→Z'}
        </button>
      </div>
    </div>
  );
}
