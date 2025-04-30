# Middleware Guide

Middleware is one of the most powerful features of Next State, allowing you to intercept state updates, perform side effects, and modify state changes. This guide provides a comprehensive overview of middleware implementation, common patterns, and best practices.

## What is Middleware?

Middleware acts as a layer between state updates and their application to the store. It allows you to:

- **Intercept and modify** state updates before they're applied
- **React to state changes** after they occur
- **Handle errors** that might happen during state updates
- **Add cross-cutting concerns** like logging, analytics, and validation
- **Implement complex behaviors** like undo/redo, persistence, and optimistic updates

Think of middleware as plugins that enhance your state management without cluttering your application code.

## Core Concepts

### Middleware Interface

```typescript
interface Middleware<T> {
  id: string;
  priority?: number;
  before?: (update: StateUpdate<T>) => StateUpdate<T> | null;
  after?: (state: T) => void;
  onError?: (error: Error) => void;
}

interface StateUpdate<T> {
  type: 'set' | 'merge' | 'reset';
  payload: DeepPartial<T>;
  meta?: Record<string, unknown>;
}
```

### Middleware Lifecycle

1. `before`: Called before state update
2. State update occurs
3. `after`: Called after state update
4. `onError`: Called if any error occurs

## Common Middleware Examples

### Logging Middleware

```typescript
const loggingMiddleware: Middleware<T> = {
  id: 'logger',
  priority: 1,
  before: (update) => {
    console.group('State Update');
    console.log('Type:', update.type);
    console.log('Payload:', update.payload);
    console.log('Meta:', update.meta);
    return update;
  },
  after: (state) => {
    console.log('New State:', state);
    console.groupEnd();
  },
  onError: (error) => {
    console.error('State Update Error:', error);
  },
};
```

### Analytics Middleware

```typescript
const analyticsMiddleware: Middleware<T> = {
  id: 'analytics',
  before: (update) => {
    if (update.meta?.track) {
      analytics.track(update.meta.track as string, {
        payload: update.payload,
      });
    }
    return update;
  },
  after: (state) => {
    // Track specific state changes
    analytics.identify(state.user?.id, {
      plan: state.user?.plan,
    });
  },
};
```

### Persistence Middleware

```typescript
const persistenceMiddleware: Middleware<T> = {
  id: 'persistence',
  priority: 2,
  after: async (state) => {
    try {
      await localStorage.setItem('app-state', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  },
};
```

### Validation Middleware

```typescript
const validationMiddleware: Middleware<T> = {
  id: 'validator',
  priority: 0, // Run first
  before: (update) => {
    const schema = getSchemaForUpdate(update.type);
    if (schema) {
      try {
        schema.parse(update.payload);
      } catch (error) {
        throw new Error(`Validation failed: ${error.message}`);
      }
    }
    return update;
  },
};
```

### Undo/Redo Middleware

```typescript
const undoMiddleware: Middleware<T> = {
  id: 'undo',
  private history: Array<{ state: T; timestamp: number }> = [],
  private maxHistory = 50,
  private currentIndex = -1,

  before: (update) => {
    if (update.meta?.skipHistory) {
      return update;
    }

    // Save current state
    this.history = [
      ...this.history.slice(0, this.currentIndex + 1),
      { state: store.getState(), timestamp: Date.now() }
    ];

    // Maintain history limit
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.currentIndex = this.history.length - 1;
    return update;
  },

  undo: () => {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const { state } = this.history[this.currentIndex];
      store.setState(state, { skipHistory: true });
    }
  },

  redo: () => {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      const { state } = this.history[this.currentIndex];
      store.setState(state, { skipHistory: true });
    }
  }
};
```

### Performance Monitoring Middleware

```typescript
const performanceMiddleware: Middleware<T> = {
  id: 'performance',
  private updates = 0,
  private totalTime = 0,
  private startTime: number | null = null,

  before: (update) => {
    this.startTime = performance.now();
    return update;
  },

  after: () => {
    if (this.startTime) {
      const duration = performance.now() - this.startTime;
      this.updates++;
      this.totalTime += duration;

      if (duration > 16) { // 60fps threshold
        console.warn('Slow state update:', {
          duration,
          averageTime: this.totalTime / this.updates
        });
      }
    }
  }
};
```

## Advanced Patterns

### Middleware Composition

```typescript
function composeMiddleware<T>(...middleware: Middleware<T>[]): Middleware<T> {
  return {
    id: 'composed',
    before: (update) => {
      return middleware.reduce((result, m) => result && m.before?.(result), update);
    },
    after: (state) => {
      middleware.forEach((m) => m.after?.(state));
    },
    onError: (error) => {
      middleware.forEach((m) => m.onError?.(error));
    },
  };
}
```

### Conditional Middleware

```typescript
function createConditionalMiddleware<T>(
  condition: (update: StateUpdate<T>) => boolean,
  middleware: Middleware<T>
): Middleware<T> {
  return {
    id: `conditional-${middleware.id}`,
    before: (update) => {
      if (condition(update)) {
        return middleware.before?.(update);
      }
      return update;
    },
    after: (state) => {
      if (condition({ type: 'set', payload: state })) {
        middleware.after?.(state);
      }
    },
  };
}
```

### Async Middleware

```typescript
const asyncMiddleware: Middleware<T> = {
  id: 'async',
  queue: (Promise<void> = Promise.resolve()),

  before: async (update) => {
    // Queue async operations
    this.queue = this.queue.then(async () => {
      try {
        await someAsyncOperation(update);
      } catch (error) {
        this.onError?.(error);
      }
    });
    return update;
  },
};
```

## Best Practices

1. **Prioritize Middleware**

   ```typescript
   const middleware = [
     { id: 'validator', priority: 0 }, // Run first
     { id: 'logger', priority: 1 }, // Run second
     { id: 'persistence', priority: 2 }, // Run last
   ];
   ```

2. **Handle Errors Gracefully**

   ```typescript
   onError: (error) => {
     // Log error
     console.error('Middleware error:', error);

     // Notify monitoring
     errorMonitoring.capture(error);

     // Recover if possible
     try {
       // Recovery logic
     } catch (recoveryError) {
       // Last resort error handling
     }
   };
   ```

3. **Use Meta for Control Flow**

   ```typescript
   store.setState(
     { user },
     {
       meta: {
         source: 'login',
         skipPersistence: true,
         track: 'user_updated',
       },
     }
   );
   ```

4. **Optimize Performance**

   ```typescript
   before: (update) => {
     // Skip expensive operations for frequent updates
     if (update.meta?.frequent) {
       return update;
     }

     // Perform expensive operation
     return expensiveOperation(update);
   };
   ```

5. **Type Safety**

   ```typescript
   interface CustomMeta {
     track?: string;
     skipPersistence?: boolean;
     source?: 'login' | 'signup' | 'update';
   }

   interface TypedMiddleware<T> extends Middleware<T> {
     before: (update: StateUpdate<T> & { meta?: CustomMeta }) => StateUpdate<T> | null;
   }
   ```

## Testing Middleware

```typescript
describe('Middleware', () => {
  let store: Store<TestState>;
  let middleware: Middleware<TestState>;

  beforeEach(() => {
    middleware = {
      id: 'test',
      before: jest.fn((update) => update),
      after: jest.fn(),
      onError: jest.fn(),
    };

    store = createStore({
      initialState: testState,
      middleware: [middleware],
    });
  });

  it('should intercept updates', () => {
    store.setState({ count: 1 });

    expect(middleware.before).toHaveBeenCalledWith({
      type: 'set',
      payload: { count: 1 },
    });

    expect(middleware.after).toHaveBeenCalledWith({
      ...testState,
      count: 1,
    });
  });

  it('should handle errors', () => {
    const error = new Error('Test error');
    middleware.before = jest.fn(() => {
      throw error;
    });

    store.setState({ count: 1 });

    expect(middleware.onError).toHaveBeenCalledWith(error);
  });
});
```

## Real-World Middleware Examples

Here are some practical examples of middleware for common use cases in production applications.

### Authentication Middleware

This middleware handles authentication state and automatically refreshes tokens:

```typescript
const authMiddleware: Middleware<AppState> = {
  id: 'auth',
  priority: 0, // Run first

  // Store reference to refresh timer
  private refreshTimer: NodeJS.Timeout | null = null;

  before: (update) => {
    // If logging out, clear refresh timer
    if (update.type === 'set' && update.payload.user === null) {
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }
    }
    return update;
  },

  after: (state) => {
    // If user exists and has token, set up refresh timer
    if (state.user?.token && !this.refreshTimer) {
      const tokenData = parseJwt(state.user.token);
      const expiresIn = tokenData.exp * 1000 - Date.now();

      // Refresh 5 minutes before expiration
      const refreshTime = Math.max(0, expiresIn - 5 * 60 * 1000);

      this.refreshTimer = setTimeout(async () => {
        try {
          const newToken = await authService.refreshToken(state.user.refreshToken);
          store.setState({
            user: {
              ...state.user,
              token: newToken
            }
          });
        } catch (error) {
          // Token refresh failed, log user out
          store.setState({ user: null });
        }
      }, refreshTime);
    }
  },

  onError: (error) => {
    // If authentication error, log user out
    if (error.code === 'AUTH_ERROR') {
      store.setState({ user: null });
    }
  }
};
```

### Form Validation Middleware

This middleware validates form inputs using a schema validation library:

```typescript
import { z } from 'zod';

// Define validation schemas for different forms
const schemas = {
  'user/update': z.object({
    name: z.string().min(2),
    email: z.string().email(),
    age: z.number().min(18).optional(),
  }),
  'product/create': z.object({
    title: z.string().min(3),
    price: z.number().positive(),
    description: z.string().min(10),
  }),
};

const formValidationMiddleware: Middleware<AppState> = {
  id: 'form-validation',

  before: (update) => {
    // Only validate updates with form data
    if (!update.meta?.formId) return update;

    const formId = update.meta.formId as string;
    const schema = schemas[formId];

    if (!schema) return update;

    try {
      // Validate form data against schema
      schema.parse(update.payload.formData);

      // If validation passes, clear any previous errors
      return {
        ...update,
        payload: {
          ...update.payload,
          formErrors: null,
        },
      };
    } catch (error) {
      // If validation fails, add errors to state
      const formErrors = error.errors.reduce((acc, err) => {
        acc[err.path.join('.')] = err.message;
        return acc;
      }, {});

      return {
        ...update,
        payload: {
          ...update.payload,
          formErrors,
        },
      };
    }
  },
};
```

### Network Synchronization Middleware

This middleware synchronizes state changes with a backend API:

```typescript
const syncMiddleware: Middleware<AppState> = {
  id: 'network-sync',
  private pendingSync = new Map<string, Promise<any>>();
  private offlineQueue: Array<{
    path: string;
    data: any;
    timestamp: number;
  }> = [];
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  handleOnline = () => {
    this.isOnline = true;
    this.processOfflineQueue();
  };

  handleOffline = () => {
    this.isOnline = false;
  };

  processOfflineQueue = async () => {
    if (!this.isOnline || this.offlineQueue.length === 0) return;

    // Process queue in order
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const item of queue) {
      try {
        await api.put(item.path, item.data);
      } catch (error) {
        console.error('Failed to sync offline change:', error);
        // Re-queue failed items
        this.offlineQueue.push(item);
      }
    }
  };

  after: async (state) => {
    // Skip if explicitly marked to skip sync
    if (update.meta?.skipSync) return;

    // Determine what changed and needs syncing
    const changes = detectChanges(previousState, state);

    for (const [path, data] of Object.entries(changes)) {
      if (this.isOnline) {
        // Create or update existing sync promise
        this.pendingSync.set(
          path,
          api.put(`/api/${path}`, data)
            .catch(error => {
              console.error(`Sync failed for ${path}:`, error);
              // Optionally retry or handle specific errors
            })
            .finally(() => {
              this.pendingSync.delete(path);
            })
        );
      } else {
        // Queue for later if offline
        this.offlineQueue.push({
          path,
          data,
          timestamp: Date.now()
        });
      }
    }
  }
};
```

### Theme Middleware

This middleware manages theme changes and persists them to system settings:

```typescript
const themeMiddleware: Middleware<AppState> = {
  id: 'theme',

  before: (update) => {
    // If theme is being updated
    if (update.payload.theme) {
      const newTheme = update.payload.theme;

      // Apply theme to document
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', newTheme);

        // Update meta theme-color for mobile browsers
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
          metaThemeColor.setAttribute('content', newTheme === 'dark' ? '#121212' : '#ffffff');
        }
      }
    }
    return update;
  },

  after: (state) => {
    // Persist theme preference
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme-preference', state.theme);
    }
  },
};
```

These real-world examples demonstrate how middleware can encapsulate complex logic while keeping your application code clean and focused.
