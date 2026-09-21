export interface ProgressState {
  status: 'running' | 'success' | 'error';
  progress: number;
  detail: string;
  updatedAt: number;
}

class ProgressStore {
  private store = new Map<string, ProgressState>();
  private ttlMs = 15 * 60 * 1000;

  set(id: string, state: Omit<ProgressState, 'updatedAt'>) {
    this.store.set(id, { ...state, updatedAt: Date.now() });
  }

  get(id: string): ProgressState | undefined {
    this.cleanup();
    return this.store.get(id);
  }

  private cleanup() {
    const now = Date.now();
    for (const [id, entry] of this.store) {
      if (now - entry.updatedAt > this.ttlMs) this.store.delete(id);
    }
  }
}

export const progressStore = new ProgressStore();