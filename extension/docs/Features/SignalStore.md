## NgRx Signal Store

The extension lists [NgRx Signal Stores](https://ngrx.io/guide/signals/signal-store) in their own **Signal Store** selector, next to the Redux instance selector. It only appears when the inspected page has at least one connected Signal Store.

- Pick a Signal Store to inspect it: its state, actions log and time travel replace the Redux instance in the monitor.
- Clear the selector (or pick an instance from the Redux selector) to go back to the Redux instances. "Autoselect instances" keeps following Redux stores only, so Signal Store updates never take over the monitor.

A Signal Store shows up when it connects with [`connect`](../API/Methods.md#connectoptions) and `type: 'signalStore'`. The `withReduxDevtools` feature below does that for you: each store gets its own instance, named after the store. A store created again after being destroyed (for example one provided by a component) reuses its previous instance; stores with the same name alive at the same time are listed as `Name`, `Name #2`, and so on.

### Usage

```ts
import { signalStore, withMethods, withState } from '@ngrx/signals';
import { updateState, withReduxDevtools } from './with-redux-devtools';

export const CounterStore = signalStore(
  { providedIn: 'root' },
  withState({ count: 0 }),
  withReduxDevtools('Counter'),
  withMethods((store) => ({
    increment() {
      // Logged as "[Counter] increment"; a plain patchState is logged as
      // "[Counter] patchState".
      updateState(store, '[Counter] increment', ({ count }) => ({
        count: count + 1,
      }));
    },
  })),
);
```

Time travel works through the Slider, along with Revert, Reset, Commit, Pause and Import. Reordering or skipping actions is not available, since a Signal Store has no reducer to recompute the states; for the same reason the Inspector does not show the per-action Jump/Skip buttons, which it only shows for instances that support skipping. The state sent back by the monitor is parsed with `JSON.parse`, so time travel expects JSON-friendly state (no `Date`, `Map` or shared references).

### Production builds

`withReduxDevtools` and `updateState` can stay in the code. In production builds (`isDevMode()` is `false`) the stores never connect to the extension, even when the user has it installed, so their state is neither visible nor changeable from the DevTools; `updateState` is then a plain `patchState`.

### `with-redux-devtools.ts`

Tested with `@ngrx/signals` 22.

```ts
import { isDevMode } from '@angular/core';
import {
  getState,
  patchState,
  signalStoreFeature,
  watchState,
  withHooks,
  type PartialStateUpdater,
  type WritableStateSource,
} from '@ngrx/signals';

interface DevtoolsMessage {
  type: string;
  state?: string;
  payload?: {
    type: string;
    nextLiftedState?: {
      computedStates: { state: object }[];
      currentStateIndex?: number;
    };
  };
}

interface DevtoolsConnection {
  init(state: object): void;
  send(action: { type: string } | null, state: object): void;
  subscribe(listener: (message: DevtoolsMessage) => void): unknown;
}

interface PooledConnection {
  devtools: DevtoolsConnection;
  onMessage?: (message: DevtoolsMessage) => void;
}

const extension = (
  globalThis as typeof globalThis & {
    __REDUX_DEVTOOLS_EXTENSION__?: {
      connect(options: object): DevtoolsConnection;
    };
  }
).__REDUX_DEVTOOLS_EXTENSION__;

// One pool per store name: a store created again after being destroyed (for
// example one provided by a component) reuses its free DevTools instance
// instead of adding a new entry to the Signal Store list.
const pools = new Map<string, PooledConnection[]>();
const inUse = new Set<PooledConnection>();

function acquire(name: string): PooledConnection | undefined {
  // Production builds never connect, even for users who have the extension:
  // it would expose the state and let it be changed from the DevTools.
  if (!extension || !isDevMode()) return undefined;
  const pool = pools.get(name) ?? [];
  pools.set(name, pool);
  let connection = pool.find((candidate) => !inUse.has(candidate));
  if (!connection) {
    const created: PooledConnection = {
      devtools: extension.connect({
        name: pool.length === 0 ? name : `${name} #${pool.length + 1}`,
        // Puts the store in the extension's Signal Store selector.
        type: 'signalStore',
        features: { pause: true, export: true, import: 'custom', jump: true },
      }),
    };
    created.devtools.subscribe((message) => created.onMessage?.(message));
    pool.push(created);
    connection = created;
  }
  inUse.add(connection);
  return connection;
}

let pendingActionType: string | undefined;

/**
 * `patchState` with an action name for the DevTools log. Plain `patchState`
 * calls are logged as `[<store name>] patchState`.
 */
export function updateState<State extends object>(
  store: WritableStateSource<State>,
  actionType: string,
  ...updaters: Array<
    Partial<NoInfer<State>> | PartialStateUpdater<NoInfer<State>>
  >
): void {
  pendingActionType = actionType;
  try {
    patchState(store, ...updaters);
  } finally {
    pendingActionType = undefined;
  }
}

/**
 * Connects a SignalStore to the Redux DevTools extension as its own instance,
 * listed in the extension's Signal Store selector.
 */
export function withReduxDevtools(name: string) {
  return signalStoreFeature(
    withHooks((store) => {
      const initialState = getState(store);
      let connection: PooledConnection | undefined;
      // Set while applying a state sent by the DevTools, so it is not logged
      // again as a new action.
      let applying = false;

      const apply = (state: object) => {
        applying = true;
        try {
          patchState(store, state);
        } finally {
          applying = false;
        }
      };

      const handleMessage = (
        devtools: DevtoolsConnection,
        message: DevtoolsMessage,
      ) => {
        if (message.type !== 'DISPATCH' || !message.payload) return;
        switch (message.payload.type) {
          case 'JUMP_TO_STATE':
          case 'JUMP_TO_ACTION':
            if (message.state) apply(JSON.parse(message.state));
            break;
          case 'ROLLBACK':
            if (message.state) {
              const state = JSON.parse(message.state);
              apply(state);
              devtools.init(state);
            }
            break;
          case 'COMMIT':
            devtools.init(getState(store));
            break;
          case 'RESET':
            apply(initialState);
            devtools.init(initialState);
            break;
          case 'IMPORT_STATE': {
            const lifted = message.payload.nextLiftedState;
            if (!lifted) break;
            const { computedStates } = lifted;
            const index = lifted.currentStateIndex ?? computedStates.length - 1;
            apply(computedStates[index].state);
            devtools.send(null, lifted);
            break;
          }
        }
      };

      return {
        onInit() {
          connection = acquire(name);
          if (!connection) return;
          const { devtools } = connection;
          devtools.init(getState(store));
          connection.onMessage = (message) => handleMessage(devtools, message);

          // watchState runs the watcher right away with the state that init()
          // already sent, then synchronously after every patchState.
          let initial = true;
          watchState(store, (state) => {
            if (initial) {
              initial = false;
              return;
            }
            if (applying) return;
            devtools.send(
              { type: pendingActionType ?? `[${name}] patchState` },
              state,
            );
          });
        },
        onDestroy() {
          if (!connection) return;
          connection.onMessage = undefined;
          inUse.delete(connection);
        },
      };
    }),
  );
}
```
