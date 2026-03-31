// Cooperative cancellation token for graceful assessment shutdown.

import type { CancelToken } from '@/lib/types';

/**
 * Concrete implementation of CancelToken.
 *
 * Provides cooperative cancellation: the runner checks `cancelled` between
 * test executions and stops scheduling new work when true. Registered
 * listeners are invoked synchronously on `cancel()`.
 */
export class CancelTokenImpl implements CancelToken {
  cancelled = false;
  private listeners: Array<() => void> = [];

  /** Register a callback to be invoked when cancel() is called. */
  onCancel(fn: () => void): void {
    this.listeners.push(fn);
  }

  /** Signal cancellation. Sets the flag and invokes all registered listeners. */
  cancel(): void {
    if (this.cancelled) return;
    this.cancelled = true;
    for (const fn of this.listeners) {
      fn();
    }
  }
}

/** Factory function to create a new CancelToken. */
export function createCancelToken(): CancelToken {
  return new CancelTokenImpl();
}
