import React from 'react';
import { JSONTree } from 'react-json-tree';
import { Action } from 'redux';
import getItemString from './getItemString.js';
import getJsonTreeTheme from './getJsonTreeTheme.js';
import SearchableTree from './SearchableTree.js';
import { TabComponentProps } from '../ActionPreview.js';

const StateTab: React.FunctionComponent<
  TabComponentProps<any, Action<string>>
> = ({
  nextState,
  base16Theme,
  invertTheme,
  labelRenderer,
  dataTypeKey,
  isWideLayout,
  sortStateTreeAlphabetically,
  disableStateTreeCollection,
  monitorState,
  updateMonitorState,
}) => (
  <SearchableTree
    data={nextState}
    monitorState={monitorState}
    updateMonitorState={updateMonitorState}
    sortByDefault={sortStateTreeAlphabetically}
  >
    {({ data, sortObjectKeys, shouldExpandNodeInitially, valueRenderer }) => (
      <JSONTree
        labelRenderer={labelRenderer}
        theme={getJsonTreeTheme(base16Theme)}
        data={data}
        getItemString={(type, data) =>
          getItemString(type, data, dataTypeKey, isWideLayout)
        }
        invertTheme={invertTheme}
        hideRoot
        sortObjectKeys={sortObjectKeys}
        shouldExpandNodeInitially={shouldExpandNodeInitially}
        valueRenderer={valueRenderer}
        {...(disableStateTreeCollection ? { collectionLimit: 0 } : {})}
      />
    )}
  </SearchableTree>
);

export default StateTab;
