import type { EnhancedMiddleware, NextStateError } from '../types/types';

export class MiddlewareRegistry<T extends Record<string, unknown>> {
  private middlewares: Map<string, EnhancedMiddleware<T>> = new Map();

  register(middleware: EnhancedMiddleware<T>): void {
    if (!middleware.id) {
      throw new Error('Middleware must have an id');
    }

    if (this.middlewares.has(middleware.id)) {
      throw new Error(`Middleware with id ${middleware.id} already registered`);
    }

    this.middlewares.set(middleware.id, middleware);
  }

  unregister(id: string): void {
    if (!this.middlewares.has(id)) {
      throw new Error(`Middleware with id ${id} not found`);
    }

    this.middlewares.delete(id);
  }

  async executeOnStateChange(prev: T, next: T): Promise<void> {
    const sortedMiddlewares = Array.from(this.middlewares.values()).sort(
      (a, b) => (b.priority || 0) - (a.priority || 0)
    );

    for (const middleware of sortedMiddlewares) {
      try {
        await middleware.onStateChange?.(prev, next);
      } catch (error) {
        this.handleError(middleware, error as Error);
      }
    }
  }

  private handleError(middleware: EnhancedMiddleware<T>, error: Error): void {
    const stateError: NextStateError = {
      code: 'MIDDLEWARE_ERROR',
      message: `Error in middleware ${middleware.id}`,
      details: {
        middlewareId: middleware.id,
        error: error.message,
      },
    };

    try {
      middleware.onError?.(stateError);
    } catch (e) {
      console.error('Error in middleware error handler:', e);
    }
  }

  getMiddleware(id: string): EnhancedMiddleware<T> | undefined {
    return this.middlewares.get(id);
  }

  clear(): void {
    this.middlewares.clear();
  }
}
