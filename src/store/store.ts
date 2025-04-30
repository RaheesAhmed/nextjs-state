import { createNextState } from '../core/core';
import type { StateConfig, Action, Selector } from '../types/types';

export function createState<T extends object>(config: StateConfig<T>) {
  const store = createNextState<T>(config);

  return {
    // Core state management
    get: () => store.getState(),
    set: async (action: Action<T>) => {
      const update = await action(store.getState());
      store.setState({ ...store.getState(), ...update });
    },

    // Subscribe to changes
    subscribe: store.subscribe,

    // React hooks
    useStore: <S>(selector: Selector<T, S>) => store.useStore(selector),
    useAction: <Args extends any[]>(action: (...args: Args) => Action<T>) =>
      store.useAction(action),

    // Server integration
    withServer: store.withServer,

    // Provider component
    Provider: store.Provider,
  };
}
