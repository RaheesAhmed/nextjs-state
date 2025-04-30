import { useMemo } from 'react';
import { NextStateHook } from './core';

export function useSelector<T, S>(hook: NextStateHook<T>, selector: (state: T) => S): S {
  return useMemo(() => selector(hook.state), [hook.state, selector]);
}
