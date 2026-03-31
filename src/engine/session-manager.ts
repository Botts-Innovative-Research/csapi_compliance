// Session manager for assessment lifecycle management.

import crypto from 'node:crypto';
import type {
  AssessmentSession,
  AssessmentResults,
  AssessmentStatus,
  AuthConfig,
  RunConfig,
} from '@/lib/types';
import { SESSION_DEFAULTS } from '@/lib/constants';
import { createCancelToken } from '@/engine/cancel-token';

/**
 * Manages the lifecycle of assessment sessions.
 *
 * Tracks active sessions in memory, enforces the maximum concurrent session
 * limit, and periodically evicts expired sessions whose results have exceeded
 * the configured TTL.
 */
export class SessionManager {
  private sessions: Map<string, AssessmentSession> = new Map();
  private evictionTimer?: NodeJS.Timeout;

  constructor() {
    this.evictionTimer = setInterval(
      () => this.evictExpired(),
      SESSION_DEFAULTS.evictionIntervalMs,
    );
    // Allow the process to exit even if the timer is still active.
    if (this.evictionTimer.unref) {
      this.evictionTimer.unref();
    }
  }

  /**
   * Create a new assessment session.
   *
   * Throws if the number of currently running sessions (status 'discovering'
   * or 'running') would exceed `SESSION_DEFAULTS.maxConcurrentSessions`.
   * Generates a non-guessable UUID as the session ID.
   */
  create(params: {
    endpointUrl: string;
    selectedClasses: string[];
    auth: AuthConfig;
    config: RunConfig;
  }): AssessmentSession {
    const runningCount = this.getRunningCount();
    if (runningCount >= SESSION_DEFAULTS.maxConcurrentSessions) {
      throw new Error(
        `Maximum concurrent sessions (${SESSION_DEFAULTS.maxConcurrentSessions}) exceeded`,
      );
    }

    const session: AssessmentSession = {
      id: crypto.randomUUID(),
      endpointUrl: params.endpointUrl,
      selectedClasses: params.selectedClasses,
      auth: params.auth,
      config: params.config,
      cancelToken: createCancelToken(),
      status: 'discovering',
      createdAt: new Date().toISOString(),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /** Get a session by ID. Returns undefined if not found or expired. */
  get(id: string): AssessmentSession | undefined {
    return this.sessions.get(id);
  }

  /** Update session status. */
  updateStatus(id: string, status: AssessmentStatus): void {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }
    session.status = status;
  }

  /** Store assessment results for a completed session. */
  storeResults(id: string, results: AssessmentResults): void {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }
    session.results = results;
  }

  /** Get count of currently running sessions (status 'discovering' or 'running'). */
  getRunningCount(): number {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.status === 'discovering' || session.status === 'running') {
        count++;
      }
    }
    return count;
  }

  /**
   * Evict expired sessions (older than `SESSION_DEFAULTS.resultTtlMs`).
   * Returns the number of sessions evicted.
   */
  evictExpired(): number {
    const now = Date.now();
    let evicted = 0;

    for (const [id, session] of this.sessions) {
      const createdAt = new Date(session.createdAt).getTime();
      if (now - createdAt > SESSION_DEFAULTS.resultTtlMs) {
        this.sessions.delete(id);
        evicted++;
      }
    }

    return evicted;
  }

  /** Stop the eviction timer (for cleanup). */
  shutdown(): void {
    if (this.evictionTimer) {
      clearInterval(this.evictionTimer);
      this.evictionTimer = undefined;
    }
  }
}
