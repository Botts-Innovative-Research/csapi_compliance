import { describe, it, expect, afterEach, vi } from 'vitest';
import { SessionManager } from '@/engine/session-manager';
import { SESSION_DEFAULTS } from '@/lib/constants';
import type { AuthConfig, RunConfig, AssessmentResults } from '@/lib/types';

/** Shared session creation parameters. */
function makeParams(overrides?: Partial<{ endpointUrl: string; selectedClasses: string[]; auth: AuthConfig; config: RunConfig }>) {
  return {
    endpointUrl: 'https://example.com/api',
    selectedClasses: ['http://example.com/conf/core'],
    auth: { type: 'none' as const },
    config: { timeoutMs: 30_000, concurrency: 5 },
    ...overrides,
  };
}

/** Minimal AssessmentResults fixture. */
function makeResults(id: string): AssessmentResults {
  return {
    id,
    endpointUrl: 'https://example.com/api',
    startedAt: new Date().toISOString(),
    status: 'completed',
    classes: [],
    exchanges: new Map(),
    summary: {
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      compliancePercent: 0,
      totalClasses: 0,
      classesPassed: 0,
      classesFailed: 0,
      classesSkipped: 0,
      durationMs: 0,
    },
  };
}

describe('SessionManager', () => {
  let manager: SessionManager;

  afterEach(() => {
    manager?.shutdown();
  });

  // ------------------------------------------------------------------
  // create()
  // ------------------------------------------------------------------

  describe('create()', () => {
    it('returns a session with UUID, correct status and cancelToken', () => {
      manager = new SessionManager();
      const session = manager.create(makeParams());

      // UUID v4 format: 8-4-4-4-12 hex digits
      expect(session.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(session.status).toBe('discovering');
      expect(session.cancelToken).toBeDefined();
      expect(session.cancelToken.cancelled).toBe(false);
      expect(session.endpointUrl).toBe('https://example.com/api');
      expect(session.selectedClasses).toEqual(['http://example.com/conf/core']);
    });

    it('throws when max concurrent running sessions exceeded', () => {
      manager = new SessionManager();

      // Fill up to the limit with running sessions.
      for (let i = 0; i < SESSION_DEFAULTS.maxConcurrentSessions; i++) {
        manager.create(makeParams());
      }

      expect(() => manager.create(makeParams())).toThrow(
        /maximum concurrent sessions/i,
      );
    });

    it('allows new sessions when existing ones are completed (not running)', () => {
      manager = new SessionManager();

      // Create sessions up to the limit.
      const sessions = [];
      for (let i = 0; i < SESSION_DEFAULTS.maxConcurrentSessions; i++) {
        sessions.push(manager.create(makeParams()));
      }

      // Mark all as completed so they no longer count as running.
      for (const s of sessions) {
        manager.updateStatus(s.id, 'completed');
      }

      // Should now be able to create a new session.
      expect(() => manager.create(makeParams())).not.toThrow();
    });
  });

  // ------------------------------------------------------------------
  // get()
  // ------------------------------------------------------------------

  describe('get()', () => {
    it('returns existing session', () => {
      manager = new SessionManager();
      const session = manager.create(makeParams());

      const retrieved = manager.get(session.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(session.id);
    });

    it('returns undefined for unknown ID', () => {
      manager = new SessionManager();
      expect(manager.get('non-existent-id')).toBeUndefined();
    });
  });

  // ------------------------------------------------------------------
  // updateStatus()
  // ------------------------------------------------------------------

  describe('updateStatus()', () => {
    it('changes session status', () => {
      manager = new SessionManager();
      const session = manager.create(makeParams());
      expect(session.status).toBe('discovering');

      manager.updateStatus(session.id, 'running');
      expect(manager.get(session.id)!.status).toBe('running');

      manager.updateStatus(session.id, 'completed');
      expect(manager.get(session.id)!.status).toBe('completed');
    });

    it('throws for unknown session ID', () => {
      manager = new SessionManager();
      expect(() => manager.updateStatus('missing', 'running')).toThrow(
        /session not found/i,
      );
    });
  });

  // ------------------------------------------------------------------
  // storeResults()
  // ------------------------------------------------------------------

  describe('storeResults()', () => {
    it('attaches results to session', () => {
      manager = new SessionManager();
      const session = manager.create(makeParams());
      const results = makeResults(session.id);

      manager.storeResults(session.id, results);

      const retrieved = manager.get(session.id);
      expect(retrieved!.results).toBeDefined();
      expect(retrieved!.results!.id).toBe(session.id);
    });

    it('throws for unknown session ID', () => {
      manager = new SessionManager();
      expect(() => manager.storeResults('missing', makeResults('missing'))).toThrow(
        /session not found/i,
      );
    });
  });

  // ------------------------------------------------------------------
  // getRunningCount()
  // ------------------------------------------------------------------

  describe('getRunningCount()', () => {
    it('counts only discovering and running sessions', () => {
      manager = new SessionManager();

      const _s1 = manager.create(makeParams()); // discovering — contributes to getRunningCount
      const s2 = manager.create(makeParams()); // discovering
      const s3 = manager.create(makeParams()); // will become completed

      manager.updateStatus(s2.id, 'running');
      manager.updateStatus(s3.id, 'completed');

      // s1 = discovering, s2 = running, s3 = completed
      expect(manager.getRunningCount()).toBe(2);
    });
  });

  // ------------------------------------------------------------------
  // evictExpired()
  // ------------------------------------------------------------------

  describe('evictExpired()', () => {
    it('removes sessions older than TTL', () => {
      manager = new SessionManager();
      const session = manager.create(makeParams());

      // Artificially age the session by backdating createdAt.
      const oldDate = new Date(Date.now() - SESSION_DEFAULTS.resultTtlMs - 1000);
      session.createdAt = oldDate.toISOString();

      const evicted = manager.evictExpired();
      expect(evicted).toBe(1);
      expect(manager.get(session.id)).toBeUndefined();
    });

    it('does not remove sessions within TTL', () => {
      manager = new SessionManager();
      const session = manager.create(makeParams());

      const evicted = manager.evictExpired();
      expect(evicted).toBe(0);
      expect(manager.get(session.id)).toBeDefined();
    });
  });

  // ------------------------------------------------------------------
  // Session ID security
  // ------------------------------------------------------------------

  describe('session ID security', () => {
    it('generates non-guessable UUIDs', () => {
      manager = new SessionManager();
      const ids = new Set<string>();

      for (let i = 0; i < 50; i++) {
        const session = manager.create(makeParams());
        // Mark as completed so we don't hit the concurrent limit.
        manager.updateStatus(session.id, 'completed');
        ids.add(session.id);
      }

      // All 50 IDs should be unique.
      expect(ids.size).toBe(50);

      // Each should be a valid UUID.
      for (const id of ids) {
        expect(id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
      }
    });
  });

  // ------------------------------------------------------------------
  // shutdown()
  // ------------------------------------------------------------------

  describe('shutdown()', () => {
    it('clears the eviction timer', () => {
      manager = new SessionManager();
      const clearSpy = vi.spyOn(global, 'clearInterval');

      manager.shutdown();

      expect(clearSpy).toHaveBeenCalledOnce();
      clearSpy.mockRestore();
    });

    it('is safe to call multiple times', () => {
      manager = new SessionManager();
      manager.shutdown();
      expect(() => manager.shutdown()).not.toThrow();
    });
  });
});
