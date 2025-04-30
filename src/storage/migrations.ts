import type { StorageConfig } from '../types/types';

export interface MigrationContext<T> {
  fromVersion: number;
  toVersion: number;
  data: unknown;
}

export type MigrationFn<T> = (context: MigrationContext<T>) => T;

export interface MigrationConfig<T> {
  version: number;
  migrate: MigrationFn<T>;
}

export class MigrationManager<T> {
  private migrations: Map<number, MigrationFn<T>> = new Map();

  constructor(private currentVersion: number) {}

  addMigration(version: number, migrate: MigrationFn<T>): void {
    if (version >= this.currentVersion) {
      throw new Error(
        `Migration version ${version} must be less than current version ${this.currentVersion}`
      );
    }
    this.migrations.set(version, migrate);
  }

  async migrateData(fromVersion: number, data: unknown): Promise<T> {
    let currentData = data;
    let currentVersion = fromVersion;

    // Sort migrations by version in ascending order
    const sortedMigrations = Array.from(this.migrations.entries())
      .filter(([version]) => version > fromVersion && version <= this.currentVersion)
      .sort(([a], [b]) => a - b);

    // Apply migrations in sequence
    for (const [version, migrate] of sortedMigrations) {
      currentData = await migrate({
        fromVersion: currentVersion,
        toVersion: version,
        data: currentData,
      });
      currentVersion = version;
    }

    return currentData as T;
  }

  getAvailableMigrations(): number[] {
    return Array.from(this.migrations.keys()).sort((a, b) => a - b);
  }
}

// Helper to create storage config with migrations
export function createStorageConfig<T>(config: {
  key: string;
  version: number;
  migrations?: MigrationConfig<T>[];
  serialize?: (data: unknown) => string;
  deserialize?: (data: string) => unknown;
}): StorageConfig<T> {
  const migrationManager = new MigrationManager<T>(config.version);

  // Add migrations if provided
  config.migrations?.forEach(({ version, migrate }) => {
    migrationManager.addMigration(version, migrate);
  });

  return {
    key: config.key as any,
    version: config.version as unknown as string,
    migrations: Object.fromEntries(
      migrationManager
        .getAvailableMigrations()
        .map((version) => [version, (data: unknown) => migrationManager.migrateData(version, data)])
    ),
    serialize: config.serialize,
    deserialize: config.deserialize as any,
  };
}

// Helper functions for common migration patterns
export const migrationHelpers = {
  // Rename a field
  renameField:
    <T>(oldKey: keyof T, newKey: keyof T): MigrationFn<T> =>
    ({ data }) => {
      const oldData = data as any;
      if (oldData[oldKey] !== undefined) {
        oldData[newKey] = oldData[oldKey];
        delete oldData[oldKey];
      }
      return oldData;
    },

  // Add a new field with default value
  addField:
    <T>(key: keyof T, defaultValue: any): MigrationFn<T> =>
    ({ data }) => ({
      ...(data as any),
      [key]: defaultValue,
    }),

  // Remove a field
  removeField:
    <T>(key: keyof T): MigrationFn<T> =>
    ({ data }) => {
      const newData = { ...(data as any) };
      delete newData[key];
      return newData;
    },

  // Transform a field value
  transformField:
    <T>(key: keyof T, transform: (value: any) => any): MigrationFn<T> =>
    ({ data }) => ({
      ...(data as any),
      [key]: transform((data as any)[key]),
    }),

  // Combine multiple migrations
  compose:
    <T>(...migrations: MigrationFn<T>[]): MigrationFn<T> =>
    (context) =>
      migrations.reduce((data, migrate) => migrate({ ...context, data }), context.data) as T,
};

// Example usage:
/*
const storageConfig = createStorageConfig({
  key: 'my-app-state',
  version: 2,
  migrations: [
    {
      version: 1,
      migrate: migrationHelpers.compose(
        migrationHelpers.renameField('oldName', 'newName'),
        migrationHelpers.addField('newField', 'default'),
        migrationHelpers.transformField('count', (v) => v * 2)
      ),
    },
  ],
});
*/
