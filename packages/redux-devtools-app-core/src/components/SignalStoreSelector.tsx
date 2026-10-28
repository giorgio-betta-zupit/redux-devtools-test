import React, { Component } from 'react';
import { connect, ResolveThunks } from 'react-redux';
import { Select } from '@redux-devtools/ui';
import { selectSignalStore } from '../actions/index.js';
import { CoreStoreState } from '../reducers/index.js';
import { isSignalStore } from '../reducers/instances.js';

type StateProps = ReturnType<typeof mapStateToProps>;
type DispatchProps = ResolveThunks<typeof actionCreators>;
type Props = StateProps & DispatchProps;

class SignalStoreSelector extends Component<Props> {
  render() {
    const instances = this.props.instances;
    const options = Object.keys(instances)
      .filter((key) => isSignalStore(instances[key]))
      .map((key) => ({ value: key, label: instances[key].name ?? key }));
    if (options.length === 0) return null;

    return (
      <Select
        aria-label="Signal Store"
        placeholder="Signal Store"
        isClearable
        options={options}
        onChange={(option) => this.props.onSelect(option?.value ?? null)}
        value={
          options.find((option) => option.value === this.props.selected) ?? null
        }
      />
    );
  }
}

const mapStateToProps = (state: CoreStoreState) => ({
  selected: state.instances.selectedSignalStore,
  instances: state.instances.options,
});

const actionCreators = {
  onSelect: selectSignalStore,
};

export default connect(mapStateToProps, actionCreators)(SignalStoreSelector);
