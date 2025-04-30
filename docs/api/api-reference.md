# Next State API Reference

This document provides a comprehensive reference for all the APIs available in Next State. Each section includes detailed descriptions, type definitions, and practical examples to help you effectively use the library in your applications.

## Core API

The core API provides the fundamental building blocks for state management in Next State.

### `create<T>`

Creates a new state store with type safety and configuration options. This is the main entry point for creating a state store in your application.

```typescript
function create<T extends object>(config: StateConfig<T>): NextStateStore<T>;
```

**Parameters:**

- `config`: Configuration object for the state store

**Returns:**

- A state store instance with methods for state management

**Example:**

```typescript
import { create } from 'next-state';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AppState {
  count: number;
  user: User | null;
  todos: Array<{ id: string; text: string; completed: boolean }>;
  theme: 'light' | 'dark';
}

const store = create<AppState>({
  initialState: {
    count: 0,
    user: null,
    todos: [],
    theme: 'light',
  },
  options: {
    // Enable DevTools in development environments
    devTools: process.env.NODE_ENV === 'development',

    // Configure persistence with localStorage
    storage: {
      key: 'my-app-state',
      version: 1,
      // Optional migrations for version changes
      migrations: {
        0: (oldState) => ({
          ...oldState,
          theme: 'light', // Add new field in migration
        }),
      },
    },

    // Add custom middleware
    middleware: [loggingMiddleware, validationMiddleware],
  },
});
```

#### Configuration Options

| Option               | Type                        | Description                                          | Default     |
| -------------------- | --------------------------- | ---------------------------------------------------- | ----------- |
| `initialState`       | `T`                         | The initial state object                             | Required    |
| `options.devTools`   | `boolean \| DevToolsConfig` | Enable development tools with optional configuration | `false`     |
| `options.storage`    | `StorageConfig<T>`          | Persistence configuration for saving state           | `undefined` |
| `options.middleware` | `Middleware<T>[]`           | Array of custom middleware functions                 | `[]`        |
| `options.suspense`   | `boolean`                   | Enable React Suspense integration                    | `false`     |
| `options.equality`   | `(a: T, b: T) => boolean`   | Custom equality function for state comparisons       | `Object.is` |

### React Hooks

Next State provides a set of React hooks for integrating state management into your components.

#### `useNextState`

Subscribe to state changes with automatic updates. This hook allows components to access and react to state changes.

```typescript
function useNextState<T, R>(
  selector?: (state: T) => R,
  equalityFn?: (prev: R, next: R) => boolean
): R;
```

**Parameters:**

- `selector`: (Optional) A function that extracts a slice of the state
- `equalityFn`: (Optional) A function to determine if the selected state has changed

**Returns:**

- The selected state (or the entire state if no selector is provided)

**Examples:**

```typescript
import { useNextState } from 'next-state';

// Access the entire state
function CompleteStateComponent() {
  const { state, setState } = useNextState();

  return (
    <div>
      <h1>Count: {state.count}</h1>
      <button onClick={() => setState({ count: state.count + 1 })}>
        Increment
      </button>
    </div>
  );
}

// Access a specific slice of state (more efficient)
function CounterComponent() {
  const count = useNextState(state => state.count);
  const increment = useNextState(state => () => ({
    count: state.count + 1
  }));

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={increment}>Increment</button>
    </div>
  );
}

// With custom equality function
function UserComponent() {
  const user = useNextState(
    state => state.user,
    (prev, next) => prev?.id === next?.id
  );

  return user ? <div>Hello, {user.name}</div> : <div>Not logged in</div>;
}
```

**Performance Considerations:**

- Always use selectors to minimize unnecessary re-renders
- Provide custom equality functions for complex objects
- Keep selectors pure and memoize expensive computations

#### `useOptimisticUpdate`

Perform optimistic updates with automatic rollback on failure. This hook is particularly useful for UI updates that need to feel responsive while waiting for server operations to complete.

```typescript
function useOptimisticUpdate<T>(): [
  (update: DeepPartial<T>, serverAction: Promise<any>) => void,
  boolean,
];
```

**Parameters:**

- None

**Returns:**

- A tuple containing:
  - An update function that takes a state update and a promise for the server action
  - A boolean indicating if there's a pending update

**Example:**

```typescript
import { useOptimisticUpdate } from 'next-state';

function TodoList() {
  const todos = useNextState(state => state.todos);
  const [optimisticUpdate, isPending] = useOptimisticUpdate();

  const toggleTodo = async (id) => {
    // Create an optimistic update
    const newTodos = todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );

    // Apply optimistic update and provide server action
    optimisticUpdate(
      { todos: newTodos },
      api.updateTodo(id, { completed: !todos.find(t => t.id === id).completed })
    );

    // The UI will update immediately, and if the server request fails,
    // the state will automatically roll back to its previous value
  };

  return (
    <div>
      {isPending && <div className="loading-indicator">Saving...</div>}
      <ul>
        {todos.map(todo => (
          <li
            key={todo.id}
            onClick={() => toggleTodo(todo.id)}
            style={{ opacity: isPending ? 0.7 : 1 }}
          >
            {todo.text} {todo.completed ? '✓' : '○'}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Use Cases:**

- Form submissions with immediate UI feedback
- Toggle actions (like/unlike, follow/unfollow)
- List item operations (add, remove, update)
- Any action where user experience benefits from immediate feedback

#### `useNextAction`

Create type-safe actions with loading states.

```typescript
function useNextAction<T, P>(
  action: (payload: P) => Promise<DeepPartial<T>>
): {
  execute: (payload: P) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
};

// Example
const { execute, isLoading } = useNextAction(async (id: string) => {
  const user = await api.getUser(id);
  return { user };
});
```

### Server Integration

#### `withServerState`

HOC for server component integration.

```typescript
function withServerState<T, P>(
  Component: React.ComponentType<P>,
  config: StateConfig<T>,
  options: ServerOptions
): React.ComponentType<P>;

// Example
export default withServerState(TodoApp, config, {
  key: 'todos',
  cache: { ttl: 60000 },
});
```

#### `createServerAction`

Create server-side actions with optimistic updates.

```typescript
function createServerAction<T, P>(
  serverState: ServerState<T>,
  action: (payload: P) => Promise<DeepPartial<T>>
): (payload: P) => Promise<void>;

// Example
const addTodo = createServerAction(serverState, async (text: string) => ({
  todos: [{ id: Date.now(), text }],
}));
```

### Storage

#### Storage Configuration

```typescript
interface StorageConfig<T> {
  key: string;
  version: number;
  migrations?: {
    [version: number]: (state: unknown) => T;
  };
  serialize?: (data: T) => string;
  deserialize?: (data: string) => T;
}

// Example
const config = {
  storage: {
    key: 'app-state',
    version: 1,
    migrations: {
      0: (oldState) => ({
        ...oldState,
        newField: 'default',
      }),
    },
  },
};
```

#### Storage Adapters

```typescript
interface StorageAdapter<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Example
const storage = createStorage(config, 'indexedDB');
```

### DevTools

#### Development Tools Configuration

```typescript
interface DevToolsConfig {
  name?: string;
  maxAge?: number;
  latency?: number;
  actionFilters?: string[];
  stateSanitizer?: (state: any) => any;
  actionSanitizer?: (action: any) => any;
}

// Example
const store = create({
  // ...
  options: {
    devTools: {
      name: 'MyApp',
      maxAge: 50,
      actionFilters: ['SET_USER'],
    },
  },
});
```

### Error Handling

#### Error Types

```typescript
interface NextStateError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Example
throw new NextStateError({
  code: 'INVALID_STATE',
  message: 'Invalid state update',
  details: { update },
});
```

### Middleware

#### Middleware Configuration

```typescript
interface Middleware<T> {
  id: string;
  priority?: number;
  before?: (update: StateUpdate<T>) => StateUpdate<T> | null;
  after?: (state: T) => void;
  onError?: (error: Error) => void;
}

// Example
const loggingMiddleware: Middleware<T> = {
  id: 'logger',
  priority: 1,
  before: (update) => {
    console.log('Before update:', update);
    return update;
  },
  after: (state) => {
    console.log('After update:', state);
  },
};
```

## Best Practices

### State Structure

1. Keep state flat and normalized
2. Use TypeScript for type safety
3. Avoid redundant data
4. Use selectors for derived data
5. Split large states into domains

### Performance

1. Use selectors with memoization
2. Batch updates when possible
3. Implement proper equality checks
4. Avoid unnecessary re-renders
5. Use optimistic updates for better UX

### Error Handling

1. Use type-safe error handling
2. Implement proper error boundaries
3. Provide detailed error messages
4. Handle edge cases gracefully
5. Log errors appropriately

### Testing

1. Test state updates
2. Test selectors
3. Test middleware
4. Test error cases
5. Test performance

## Migration Guide

### Version 1.x to 2.x

```typescript
// Before (1.x)
const store = createStore({
  state: initialState,
});

// After (2.x)
const store = create({
  initialState,
  options: {
    devTools: true,
  },
});
```

## TypeScript Support

The library is written in TypeScript and provides full type safety:

```typescript
interface AppState {
  user: User | null;
  todos: Todo[];
  settings: Settings;
}

const store = create<AppState>({
  initialState: {
    user: null,
    todos: [],
    settings: defaultSettings,
  },
});

// Type-safe selectors
const user = useNextState((state) => state.user);
// Type-safe updates
store.setState({ user: newUser });
```
