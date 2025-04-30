# Installation Guide

This guide will walk you through the process of installing and setting up Next State in your Next.js application.

## Prerequisites

Before installing Next State, make sure you have:

- Node.js 14.x or later
- Next.js 12.x or later (for full feature support)
- TypeScript 4.5+ (recommended for type safety)

## Installation

You can install Next State using npm, yarn, or pnpm:

```bash
# Using npm
npm install nextjs-state

# Using yarn
yarn add nextjs-state

# Using pnpm
pnpm add nextjs-state
```

## Basic Setup

After installation, you can set up Next State in your application:

### 1. Define Your State Types

First, define the types for your application state:

```typescript
// types/state.ts
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  isLoading: boolean;
  error: string | null;
}
```

### 2. Create Your Store

Create a store with your initial state:

```typescript
// store/index.ts
import { create } from 'nextjs-state';
import type { AppState } from '../types/state';

export const { useNextState } = create<AppState>({
  initialState: {
    user: null,
    theme: 'light',
    isLoading: false,
    error: null
  },
  options: {
    // Enable DevTools in development
    devTools: process.env.NODE_ENV === 'development',
    
    // Optional: Configure persistence
    storage: {
      key: 'app-state',
      version: '1.0'
    }
  }
});
```

### 3. Use in Components

Now you can use the state in your components:

```tsx
// components/Header.tsx
import { useNextState } from '../store';

export function Header() {
  const user = useNextState(state => state.user);
  const theme = useNextState(state => state.theme);
  const setTheme = useNextState(state => (newTheme: 'light' | 'dark') => ({
    theme: newTheme
  }));
  
  return (
    <header className={theme === 'dark' ? 'bg-dark' : 'bg-light'}>
      {user ? (
        <div>Welcome, {user.name}</div>
      ) : (
        <div>Please log in</div>
      )}
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Toggle Theme
      </button>
    </header>
  );
}
```

## Next.js App Router Integration

For Next.js applications using the App Router, you'll need to set up a client-side provider:

### 1. Create a Provider Component

```tsx
// app/providers.tsx
'use client';

import { ReactNode } from 'react';
import { StateProvider } from 'nextjs-state';
import { store } from '../store';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StateProvider store={store}>
      {children}
    </StateProvider>
  );
}
```

### 2. Use the Provider in Your Layout

```tsx
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

## Server Component Integration

Next State supports server components with the `withServerState` HOC:

```tsx
// app/todos/page.tsx
import { withServerState } from 'nextjs-state/server';
import { TodoList } from './components/TodoList';
import { fetchTodos } from './actions';

async function TodoPage() {
  const initialTodos = await fetchTodos();
  
  return <TodoList initialTodos={initialTodos} />;
}

export default withServerState(TodoPage, {
  key: 'todos',
  revalidate: 60 // Revalidate every 60 seconds
});
```

## Advanced Configuration

### Adding Middleware

You can add middleware for logging, validation, or other purposes:

```typescript
// store/middleware.ts
import { Middleware } from 'nextjs-state';
import type { AppState } from '../types/state';

export const loggingMiddleware: Middleware<AppState> = {
  id: 'logger',
  before: (update) => {
    console.log('Before update:', update);
    return update;
  },
  after: (state) => {
    console.log('After update:', state);
  }
};

export const validationMiddleware: Middleware<AppState> = {
  id: 'validator',
  before: (update) => {
    // Validate updates here
    if (update.user && !update.user.email) {
      console.error('User must have an email');
      return null; // Reject the update
    }
    return update;
  }
};
```

Then add them to your store:

```typescript
// store/index.ts
import { create } from 'nextjs-state';
import { loggingMiddleware, validationMiddleware } from './middleware';
import type { AppState } from '../types/state';

export const { useNextState } = create<AppState>({
  initialState: {
    // ...
  },
  options: {
    // ...
    middleware: [loggingMiddleware, validationMiddleware]
  }
});
```

## Troubleshooting

### Common Issues

#### "Cannot update a component while rendering a different component"

This error occurs when you try to update state during rendering. Move your state updates to event handlers or effects:

```tsx
// ❌ Wrong
function Component() {
  const setState = useNextState(state => state.setState);
  setState({ count: 1 }); // Error!
  
  return <div>...</div>;
}

// ✅ Correct
function Component() {
  const setState = useNextState(state => state.setState);
  
  useEffect(() => {
    setState({ count: 1 });
  }, []);
  
  return <div>...</div>;
}
```

#### "Maximum update depth exceeded"

This happens when your state updates cause an infinite loop. Check your selectors and update logic:

```tsx
// ❌ Wrong - causes infinite loop
function Component() {
  const { state, setState } = useNextState();
  
  // This runs on every render!
  setState({ count: state.count + 1 });
  
  return <div>{state.count}</div>;
}

// ✅ Correct
function Component() {
  const { state, setState } = useNextState();
  
  const increment = () => {
    setState({ count: state.count + 1 });
  };
  
  return (
    <div>
      {state.count}
      <button onClick={increment}>Increment</button>
    </div>
  );
}
```

## Next Steps

Now that you've installed and set up Next State, you can:

- Learn about [Core Concepts](./core-concepts.md)
- Explore the [API Reference](../api/api-reference.md)
- Check out the [Middleware Guide](../guides/middleware.md)
- Read the [Testing Guide](../guides/testing.md)

For more examples and advanced usage, visit the [GitHub repository](https://github.com/RaheesAhmed/next-state).
