import {
  getActiveInstance,
  instances,
  InstancesState,
  SIGNAL_STORE_LIB,
} from '../src/reducers/instances.js';
import {
  CoreStoreAction,
  selectInstance,
  selectSignalStore,
} from '../src/actions/index.js';
import {
  LIFTED_ACTION,
  REMOVE_INSTANCE,
  UPDATE_STATE,
} from '../src/constants/actionTypes.js';

const connect = (
  connectionId: string,
  instanceId: string,
  type?: string,
): CoreStoreAction =>
  ({
    type: UPDATE_STATE,
    id: connectionId,
    request: {
      type: 'INIT',
      instanceId,
      payload: JSON.stringify({ count: 0 }),
      libConfig: { name: instanceId, type },
    },
  }) as unknown as CoreStoreAction;

const reduce = (actions: CoreStoreAction[], state?: InstancesState) =>
  actions.reduce((next, action) => instances(next, action), state);

describe('instances reducer with Signal Stores', () => {
  it('keeps `current` on the Redux instance when a Signal Store updates', () => {
    const state = reduce([
      connect('7', '7/1'),
      connect('7', '7/2', SIGNAL_STORE_LIB),
    ])!;

    expect(state.current).toBe('7/1');
    expect(getActiveInstance(state)).toBe('7/1');
  });

  it('shows the selected Signal Store over the Redux selection', () => {
    const state = reduce([
      connect('7', '7/1'),
      connect('7', '7/2', SIGNAL_STORE_LIB),
      selectInstance('7/1'),
      selectSignalStore('7/2'),
    ])!;

    expect(state.selected).toBe('7/1');
    expect(getActiveInstance(state)).toBe('7/2');
  });

  it('falls back to the Redux selection when the Signal Store is cleared', () => {
    const state = reduce([
      connect('7', '7/1'),
      connect('7', '7/2', SIGNAL_STORE_LIB),
      selectSignalStore('7/2'),
      selectSignalStore(null),
    ])!;

    expect(getActiveInstance(state)).toBe('7/1');
  });

  it('jumps in the instance the panel names, not the local selection', () => {
    const state = reduce([
      connect('7', '7/1'),
      connect('7', '7/2', SIGNAL_STORE_LIB),
      {
        type: LIFTED_ACTION,
        message: 'DISPATCH',
        action: { type: 'JUMP_TO_STATE', index: 0 },
        instanceId: '7/2',
      } as CoreStoreAction,
    ])!;

    expect(state.states['7/2'].currentStateIndex).toBe(0);
    expect(state.states['7/1'].currentStateIndex).toBe(
      state.states['7/1'].computedStates.length - 1,
    );
  });

  it('clears the selected Signal Store and skips Signal Stores for `current` on removal', () => {
    const state = reduce([
      connect('9', '9/1', SIGNAL_STORE_LIB),
      connect('9', '9/2'),
      connect('7', '7/1'),
      connect('7', '7/2', SIGNAL_STORE_LIB),
      selectSignalStore('7/2'),
      { type: REMOVE_INSTANCE, id: '7' } as CoreStoreAction,
    ])!;

    expect(state.selectedSignalStore).toBeNull();
    expect(state.current).toBe('9/2');
  });
});
