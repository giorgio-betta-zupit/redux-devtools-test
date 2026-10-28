import React, { Component } from 'react';
import { connect, ResolveThunks } from 'react-redux';
import { Select } from '@redux-devtools/ui';
import { selectInstance, selectSignalStore } from '../actions/index.js';
import { CoreStoreState } from '../reducers/index.js';
import { isSignalStore } from '../reducers/instances.js';

type StateProps = ReturnType<typeof mapStateToProps>;
type DispatchProps = ResolveThunks<typeof actionCreators>;
type Props = StateProps & DispatchProps;

class InstanceSelector extends Component<Props> {
  select?: { readonly value: string; readonly label: string | number }[];

  render() {
    this.select = [{ value: '', label: 'Autoselect instances' }];
    const instances = this.props.instances;
    let name;
    Object.keys(instances).forEach((key) => {
      if (isSignalStore(instances[key])) return;
      name = instances[key].name;
      if (name !== undefined) this.select!.push({ value: key, label: name });
    });

    return (
      <Select
        options={this.select}
        onChange={(option) => {
          // Picking a Redux instance leaves the Signal Store view.
          if (this.props.selectedSignalStore) {
            this.props.onSelectSignalStore(null);
          }
          this.props.onSelect(option!.value);
        }}
        value={this.select.find(
          (option) => option.value === this.props.selected,
        )}
      />
    );
  }
}

const mapStateToProps = (state: CoreStoreState) => ({
  selected: state.instances.selected,
  selectedSignalStore: state.instances.selectedSignalStore,
  instances: state.instances.options,
});

const actionCreators = {
  onSelect: selectInstance,
  onSelectSignalStore: selectSignalStore,
};

export default connect(mapStateToProps, actionCreators)(InstanceSelector);
