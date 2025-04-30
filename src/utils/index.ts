import type { PerformanceMonitor, ListenerSet as IListenerSet } from '../types/types';

export function createPerformanceMonitor(): PerformanceMonitor {
  let updates = 0;
  let totalTime = 0;
  let lastUpdateTime = 0;

  return {
    now: () => performance.now(),
    track: (event: string, duration: number) => {
      if (event === 'update') {
        updates++;
        totalTime += duration;
        lastUpdateTime = duration;
      }
    },
    getMetrics: () => ({
      updates,
      avgUpdateTime: updates > 0 ? totalTime / updates : 0,
      lastUpdateTime,
    }),
  };
}

export function createDebugLogger(enabled: boolean) {
  return {
    log: (message: string, data?: unknown) => {
      if (enabled) {
        console.log(`[NextState] ${message}`, data);
      }
    },
    error: (context: string, error: unknown) => {
      if (enabled) {
        console.error(`[NextState] Error in ${context}:`, error);
      }
    },
  };
}

export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue &&
      targetValue &&
      typeof sourceValue === 'object' &&
      typeof targetValue === 'object' &&
      !Array.isArray(sourceValue)
    ) {
      result[key] = deepMerge(targetValue, sourceValue as any);
    } else {
      result[key] = sourceValue as any;
    }
  }

  return result;
}

export class ListenerSet<T> implements IListenerSet<T> {
  private listeners = new Set<(state: T) => void>();
  private debug: boolean;

  constructor(debug: boolean) {
    this.debug = debug;
  }

  add(listener: (state: T) => void) {
    this.listeners.add(listener);
    if (this.debug) {
      console.log('[NextState] Listener added, total:', this.listeners.size);
    }
  }

  delete(listener: (state: T) => void) {
    this.listeners.delete(listener);
    if (this.debug) {
      console.log('[NextState] Listener removed, total:', this.listeners.size);
    }
  }

  notify(state: T, performance: PerformanceMonitor) {
    const startTime = performance.now();
    this.listeners.forEach((listener) => listener(state));
    performance.track('notify', performance.now() - startTime);
  }
}
