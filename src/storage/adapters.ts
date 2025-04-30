import type { StorageConfig, NextStateError } from '../types/types';

export interface StorageAdapter<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Local Storage Adapter
export class LocalStorageAdapter<T> implements StorageAdapter<T> {
  constructor(private config: StorageConfig<T>) {}

  async get(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const { version, data } = this.config.deserialize?.(item) ?? JSON.parse(item);

      if (version === this.config.version) {
        return data as T;
      }

      // Handle migration
      if (this.config.migrations?.[version]) {
        const migratedData = this.config.migrations[version](data as T);
        await this.set(key, migratedData as T);
        return migratedData as T;
      }

      throw new Error(`No migration found for version ${version}`);
    } catch (error) {
      throw {
        code: 'STORAGE_ERROR',
        message: 'Failed to retrieve data from localStorage',
        details: { error, key },
      } as NextStateError;
    }
  }

  async set(key: string, value: T): Promise<void> {
    try {
      const data = {
        version: this.config.version,
        data: value,
      };
      const serialized = this.config.serialize?.(data) ?? JSON.stringify(data);
      localStorage.setItem(key, serialized);
    } catch (error) {
      throw {
        code: 'STORAGE_ERROR',
        message: 'Failed to save data to localStorage',
        details: { error, key },
      } as NextStateError;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      throw {
        code: 'STORAGE_ERROR',
        message: 'Failed to remove data from localStorage',
        details: { error, key },
      } as NextStateError;
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      throw {
        code: 'STORAGE_ERROR',
        message: 'Failed to clear localStorage',
        details: { error },
      } as NextStateError;
    }
  }
}

// IndexedDB Adapter
export class IndexedDBAdapter<T> implements StorageAdapter<T> {
  private dbName = 'next-state-store';
  private storeName = 'state';
  private db: IDBDatabase | null = null;

  constructor(private config: StorageConfig<T>) {
    this.initDB().catch(console.error);
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.config.version as unknown as number);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  async get(key: string): Promise<T | null> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          if (!request.result) {
            resolve(null);
            return;
          }

          const { version, data } = this.config.deserialize?.(request.result) ?? request.result;

          if (version === this.config.version) {
            resolve(data as T);
          } else if (this.config.migrations?.[version]) {
            const migratedData = this.config.migrations[version](data as T);
            this.set(key, migratedData as T)
              .then(() => resolve(migratedData as T))
              .catch(reject);
          } else {
            reject(new Error(`No migration found for version ${version}`));
          }
        };
      });
    } catch (error) {
      throw {
        code: 'STORAGE_ERROR',
        message: 'Failed to retrieve data from IndexedDB',
        details: { error, key },
      } as NextStateError;
    }
  }

  async set(key: string, value: T): Promise<void> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const data = {
          version: this.config.version,
          data: value,
        };
        const serialized = this.config.serialize?.(data) ?? data;
        const request = store.put(serialized, key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      throw {
        code: 'STORAGE_ERROR',
        message: 'Failed to save data to IndexedDB',
        details: { error, key },
      } as NextStateError;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      throw {
        code: 'STORAGE_ERROR',
        message: 'Failed to remove data from IndexedDB',
        details: { error, key },
      } as NextStateError;
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      throw {
        code: 'STORAGE_ERROR',
        message: 'Failed to clear IndexedDB',
        details: { error },
      } as NextStateError;
    }
  }
}

// Memory Adapter (for testing/SSR)
export class MemoryAdapter<T> implements StorageAdapter<T> {
  private store = new Map<string, string>();

  constructor(private config: StorageConfig<T>) {}

  async get(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;

    const { version, data } = this.config.deserialize?.(item) ?? JSON.parse(item);

    if (version === this.config.version) {
      return data as T;
    }

    if (this.config.migrations?.[version]) {
      const migratedData = this.config.migrations[version](data as T);
      await this.set(key, migratedData as T);
      return migratedData as T;
    }

    throw new Error(`No migration found for version ${version}`);
  }

  async set(key: string, value: T): Promise<void> {
    const data = {
      version: this.config.version,
      data: value,
    };
    const serialized = this.config.serialize?.(data) ?? JSON.stringify(data);
    this.store.set(key, serialized);
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

// Storage Factory
export function createStorage<T>(
  config: StorageConfig<T>,
  type: 'localStorage' | 'indexedDB' | 'memory' = 'localStorage'
): StorageAdapter<T> {
  switch (type) {
    case 'localStorage':
      return new LocalStorageAdapter(config);
    case 'indexedDB':
      return new IndexedDBAdapter(config);
    case 'memory':
      return new MemoryAdapter(config);
    default:
      throw new Error(`Unsupported storage type: ${type}`);
  }
}
