# Next State Documentation

Welcome to the official documentation for Next State, a modern, type-safe state management solution designed specifically for Next.js applications.

## Table of Contents

### Getting Started
- [Installation Guide](./getting-started/installation.md)
- [Core Concepts](./getting-started/core-concepts.md)
- [Quick Start Tutorial](./getting-started/quick-start.md)
- [TypeScript Integration](./getting-started/typescript.md)

### API Reference
- [API Reference](./api/api-reference.md)
- [Hooks API](./api/hooks.md)
- [Server API](./api/server.md)
- [Middleware API](./api/middleware.md)

### Guides
- [Middleware Guide](./guides/middleware.md)
- [Testing Guide](./guides/testing.md)
- [Performance Guide](./guides/performance.md)
- [Server Integration](./guides/server.md)
- [Migration Guide](./guides/migration.md)

### Advanced Topics
- [Technical Documentation](./technical_documentation.md)
- [State Design Patterns](./advanced/state-design-patterns.md)
- [Custom Middleware](./advanced/custom-middleware.md)
- [Server Component Integration](./advanced/server-components.md)
- [Advanced TypeScript Usage](./advanced/advanced-typescript.md)

## Key Features

Next State provides a comprehensive set of features for state management in Next.js applications:

- **Type Safety**: Full TypeScript support with type inference and strict null checks
- **Lightweight**: Less than 1KB minified and gzipped for optimal bundle size
- **Middleware**: Extensible middleware system for logging, persistence, validation, and more
- **Persistence**: Built-in storage adapters for localStorage and indexedDB with migration support
- **Selectors**: Efficient state access with automatic memoization to prevent unnecessary re-renders
- **DevTools**: Integrated development tools for debugging and time-travel
- **Server Components**: First-class support for Next.js App Router and Server Components
- **Optimistic Updates**: Built-in support for optimistic UI updates with server synchronization
- **Zero Dependencies**: Only React as a peer dependency for minimal footprint

## Community and Support

- [GitHub Repository](https://github.com/RaheesAhmed/next-state)
- [Contributing Guide](../CONTRIBUTING.md)
- [Code of Conduct](../CODE_OF_CONDUCT.md)
- [License](../LICENSE)

## Examples

Check out these examples to see Next State in action:

- [Counter Example](https://github.com/RaheesAhmed/next-state/tree/main/examples/counter)
- [Todo App](https://github.com/RaheesAhmed/next-state/tree/main/examples/todo)
- [Server Component Example](https://github.com/RaheesAhmed/next-state/tree/main/examples/server-integration)
- [E-commerce Example](https://github.com/RaheesAhmed/next-state/tree/main/examples/e-commerce)

## Comparison with Other Libraries

| Feature | Next State | Redux | Zustand | Jotai | Recoil |
|---------|------------|-------|---------|-------|--------|
| Bundle Size | <1KB | ~4KB | ~3KB | ~2KB | ~20KB |
| TypeScript | ✅ | ✅ | ✅ | ✅ | ✅ |
| Middleware | ✅ | ✅ | ✅ | ❌ | ❌ |
| Server Components | ✅ | ❌ | ❌ | ✅ | ❌ |
| Persistence | ✅ | ❌ | ✅ | ❌ | ✅ |
| DevTools | ✅ | ✅ | ✅ | ❌ | ✅ |
| Learning Curve | Low | High | Low | Medium | High |
| Next.js Integration | ✅ | ❌ | ❌ | ❌ | ❌ |

## Getting Started

To get started with Next State, check out the [Installation Guide](./getting-started/installation.md) and [Core Concepts](./getting-started/core-concepts.md).
