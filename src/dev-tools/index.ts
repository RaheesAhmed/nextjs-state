import type { StateSnapshot } from '../types/types';

interface Action {
  type: string;
  payload: unknown;
  duration: number;
  timestamp: number;
}

export class DevTools<T extends object> {
  private snapshots: StateSnapshot<T>[] = [];
  private actions: Action[] = [];
  private maxSnapshots = 50;

  constructor(initialState: T) {
    this.createSnapshot(initialState);

    if (typeof window !== 'undefined') {
      (window as any).__NEXT_STATE_DEV_TOOLS__ = this;
    }
  }

  createSnapshot(state: T) {
    this.snapshots.push({
      state: JSON.parse(JSON.stringify(state)), // Deep clone to prevent mutations
      timestamp: Date.now(),
    });

    // Keep only the last maxSnapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  logAction(action: Omit<Action, 'timestamp'>) {
    this.actions.push({
      ...action,
      timestamp: Date.now(),
    });

    // Keep only the last maxSnapshots actions
    if (this.actions.length > this.maxSnapshots) {
      this.actions.shift();
    }
  }

  getSnapshots() {
    return this.snapshots;
  }

  getActions() {
    return this.actions;
  }

  getLatestSnapshot() {
    return this.snapshots[this.snapshots.length - 1];
  }

  clear() {
    this.snapshots = [];
    this.actions = [];
  }
}
