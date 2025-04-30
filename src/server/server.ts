import type { DeepPartial, StateConfig, StateSnapshot } from '../types/types';

// Server-side state container
const SERVER_STATE = new Map<string, unknown>();

// Cache configuration
interface CacheConfig {
  ttl: number;
  revalidate?: boolean;
  tags?: string[];
}

interface ServerStateOptions<T> {
  cache?: CacheConfig;
  key: string;
}

/**
 * Server-side state management with caching and revalidation
 */
export class ServerState<T extends object> {
  private cache: Map<string, { value: T; timestamp: number }> = new Map();
  private subscribers = new Set<(key: string) => void>();

  constructor(
    private config: StateConfig<T>,
    private options: ServerStateOptions<T>
  ) {}

  /**
   * Get state with cache support
   */
  async get(revalidate = false): Promise<T> {
    const cached = this.cache.get(this.options.key);
    const now = Date.now();

    if (
      cached &&
      !revalidate &&
      (!this.options.cache?.ttl || now - cached.timestamp < this.options.cache.ttl)
    ) {
      return cached.value;
    }

    const value = (SERVER_STATE.get(this.options.key) as T) || this.config.initialState;
    this.cache.set(this.options.key, { value, timestamp: now });
    return value;
  }

  /**
   * Update state with optimistic updates
   */
  async set(update: DeepPartial<T>): Promise<void> {
    const current = await this.get();
    const next = { ...current, ...update };

    SERVER_STATE.set(this.options.key, next);
    this.cache.set(this.options.key, { value: next, timestamp: Date.now() });

    this.subscribers.forEach((callback) => callback(this.options.key));
  }

  /**
   * Create snapshot for time-travel debugging
   */
  async createSnapshot(): Promise<StateSnapshot<T>> {
    const state = await this.get();
    return {
      state,
      timestamp: Date.now(),
    };
  }

  /**
   * Revalidate cache
   */
  async revalidate(tags?: string[]): Promise<void> {
    if (!tags || tags.some((tag) => this.options.cache?.tags?.includes(tag))) {
      await this.get(true);
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (key: string) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
}

/**
 * Server Component wrapper for state hydration
 */
export function withServerState<T extends object, P extends object>(
  Component: React.ComponentType<P>,
  config: StateConfig<T>,
  options: ServerStateOptions<T>
): React.ComponentType<P> {
  return async function ServerStateWrapper(props: P) {
    const serverState = new ServerState(config, options);
    const initialState = await serverState.get();

    return {
      Component,
      props: {
        ...props,
        initialState,
        serverState,
      },
    };
  };
}

/**
 * Server Action creator with optimistic updates
 */
export function createServerAction<T extends object, Args extends any[]>(
  serverState: ServerState<T>,
  action: (...args: Args) => Promise<DeepPartial<T>>
) {
  return async (...args: Args): Promise<void> => {
    try {
      const update = await action(...args);
      await serverState.set(update);
    } catch (error) {
      console.error('Server action failed:', error);
      throw error;
    }
  };
}

/**
 * Edge runtime state handler
 */
export class EdgeState<T extends object> {
  constructor(
    private config: StateConfig<T>,
    private options: ServerStateOptions<T>
  ) {}

  async get(): Promise<T> {
    try {
      const cached = await caches.default.match(this.options.key);
      if (cached) {
        const data = await cached.json();
        return data as T;
      }
    } catch (error) {
      console.error('Edge state fetch failed:', error);
    }

    return this.config.initialState;
  }

  async set(update: DeepPartial<T>): Promise<void> {
    try {
      const current = await this.get();
      const next = { ...current, ...update };

      const response = new Response(JSON.stringify(next), {
        headers: {
          'Cache-Control': this.options.cache?.ttl
            ? `s-maxage=${this.options.cache.ttl}`
            : 'no-store',
        },
      });

      await caches.default.put(this.options.key, response);
    } catch (error) {
      console.error('Edge state update failed:', error);
      throw error;
    }
  }
}

/**
 * Data fetching wrapper with cache control
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheConfig
): Promise<T> {
  const cached = await caches.default.match(key);

  if (cached && options?.ttl) {
    const data = await cached.json();
    if (Date.now() - data.timestamp < options.ttl) {
      return data.value as T;
    }
  }

  const value = await fetcher();
  const response = new Response(
    JSON.stringify({
      value,
      timestamp: Date.now(),
    }),
    {
      headers: {
        'Cache-Control': options?.ttl ? `s-maxage=${options.ttl}` : 'no-store',
      },
    }
  );

  await caches.default.put(key, response);
  return value;
}
