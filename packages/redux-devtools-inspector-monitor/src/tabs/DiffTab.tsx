import React, { FunctionComponent } from 'react';
import JSONDiff, { diffFilterOptions } from './JSONDiff.js';
import SearchableTree from './SearchableTree.js';
import { TabComponentProps } from '../ActionPreview.js';
import { Action } from 'redux';
import type { Delta } from 'jsondiffpatch';

const DiffTab: FunctionComponent<
  TabComponentProps<unknown, Action<string>>
> = ({
  delta,
  base16Theme,
  invertTheme,
  labelRenderer,
  isWideLayout,
  dataTypeKey,
  sortStateTreeAlphabetically,
  monitorState,
  updateMonitorState,
}) => (
  <SearchableTree
    data={delta}
    monitorState={monitorState}
    updateMonitorState={updateMonitorState}
    sortByDefault={sortStateTreeAlphabetically}
    filterOptions={diffFilterOptions}
  >
    {({ data, sortObjectKeys, shouldExpandNodeInitially }) => (
      <JSONDiff
        delta={data as Delta | null | undefined | false}
        {...{
          base16Theme,
          invertTheme,
          labelRenderer,
          isWideLayout,
          dataTypeKey,
          sortObjectKeys,
          shouldExpandNodeInitially,
        }}
      />
    )}
  </SearchableTree>
);

export default DiffTab;
