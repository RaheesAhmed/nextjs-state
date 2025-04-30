import { INextStateError, MigrationFn, NextStateStorageConfig } from '../types/types';

export class IndexedDBStorage<T> {
  private readonly config: NextStateStorageConfig<T>;
  private db: IDBDatabase | null = null;

  constructor(config: NextStateStorageConfig<T>) {
    this.config = config;
  }

  private async connect(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        this.config.key || 'next-state',
        this.config.version as unknown as number
      );

      request.onerror = () => this.handleError('CONNECTION_ERROR', request.error);
      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains('state')) {
          db.createObjectStore('state', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };
    });
  }

  private async withRetry<R>(operation: () => Promise<R>, attempt = 1): Promise<R> {
    try {
      return await operation();
    } catch (error) {
      if (
        attempt < (this.config.retry?.attempts || 3) &&
        error instanceof Error &&
        error.name !== 'QuotaExceededError'
      ) {
        await new Promise((resolve) => setTimeout(resolve, this.config.retry?.delay || 1000));
        return this.withRetry(operation, attempt + 1);
      }
      throw error;
    }
  }

  async get(): Promise<T | null> {
    return this.withRetry(async () => {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['state'], 'readonly');
        const store = transaction.objectStore('state');
        const request = store.get('current');

        request.onerror = () => this.handleError('READ_ERROR', request.error);
        request.onsuccess = () => {
          const { version, data } = request.result || {
            version: 0,
            data: null,
          };
          if (data && version < (this.config.version || 1)) {
            resolve(this.migrateState(data, version));
          } else {
            resolve(data);
          }
        };
      });
    });
  }

  private async migrateState(state: any, fromVersion: number): Promise<T> {
    const migrations = this.config.migrations || [];
    let currentState = state;

    for (const migration of migrations as unknown as MigrationFn<T>[]) {
      if (migration.version > fromVersion) {
        currentState = migration.migrate(currentState);
      }
    }

    return currentState;
  }

  private handleError(code: string, error: Error | null) {
    const nextError: INextStateError = {
      code: code as any,
      message: error?.message || 'Unknown storage error',
      originalError: error,
    };
    this.config.onError?.(nextError);
    throw nextError;
  }
}
