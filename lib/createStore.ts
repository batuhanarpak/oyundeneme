import { useSyncExternalStore } from 'react';

/**
 * Minimal zustand-compatible store built on useSyncExternalStore.
 * Zero dependencies — keeps the bundle lean and the Vercel build instant.
 */
export function create<T extends object>(
  initializer: (
    set: (partial: Partial<T> | ((state: T) => Partial<T>)) => void,
    get: () => T
  ) => T
) {
  let state: T;
  const listeners = new Set<() => void>();

  const set = (partial: Partial<T> | ((state: T) => Partial<T>)) => {
    const next =
      typeof partial === 'function'
        ? (partial as (state: T) => Partial<T>)(state)
        : partial;
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
  };

  const get = () => state;

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  state = initializer(set, get);

  function useStore<S>(selector: (state: T) => S): S {
    return useSyncExternalStore(
      subscribe,
      () => selector(state),
      () => selector(state)
    );
  }

  useStore.getState = get;
  useStore.setState = set;
  useStore.subscribe = subscribe;

  return useStore;
}
