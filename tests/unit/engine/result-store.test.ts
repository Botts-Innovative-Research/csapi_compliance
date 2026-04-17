// SCENARIO coverage (WARN-003 traceability sweep 2026-04-17T19:35Z):
//   SCENARIO-SESS-PERSIST-001..004 (results disk persistence, load, TTL, corruption)

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { AssessmentResults } from '@/lib/types';
import { ResultStore } from '@/engine/result-store';

/** Create a minimal AssessmentResults fixture. */
function makeResults(id: string): AssessmentResults {
  return {
    id,
    endpointUrl: 'https://example.com/api',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: 'completed',
    classes: [],
    exchanges: new Map(),
    summary: {
      totalTests: 1,
      passed: 1,
      failed: 0,
      skipped: 0,
      compliancePercent: 100,
      totalClasses: 1,
      classesPassed: 1,
      classesFailed: 0,
      classesSkipped: 0,
      durationMs: 42,
    },
  };
}

describe('ResultStore', () => {
  let tmpDir: string;
  let store: ResultStore;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'result-store-test-'));
    store = new ResultStore(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // ------------------------------------------------------------------
  // dump()
  // ------------------------------------------------------------------

  describe('dump()', () => {
    it('writes a JSON file named {assessmentId}.json', async () => {
      const results = makeResults('assessment-001');
      await store.dump(results);

      const filePath = path.join(tmpDir, 'assessment-001.json');
      const stat = await fs.stat(filePath);
      expect(stat.isFile()).toBe(true);

      const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      expect(content.id).toBe('assessment-001');
      expect(content.endpointUrl).toBe('https://example.com/api');
    });

    it('preserves Map data (exchanges) through serialization', async () => {
      const results = makeResults('assessment-map');
      results.exchanges.set('ex-1', {
        id: 'ex-1',
        request: { method: 'GET', url: 'https://example.com', headers: {} },
        response: { statusCode: 200, headers: {}, body: '{}', responseTimeMs: 10 },
        metadata: { truncated: false, binaryBody: false, bodySize: 2 },
      });

      await store.dump(results);

      const loaded = await store.loadDumps();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].exchanges).toBeInstanceOf(Map);
      expect(loaded[0].exchanges.get('ex-1')).toBeDefined();
      expect(loaded[0].exchanges.get('ex-1')!.id).toBe('ex-1');
    });
  });

  // ------------------------------------------------------------------
  // loadDumps()
  // ------------------------------------------------------------------

  describe('loadDumps()', () => {
    it('reads all JSON files from the directory', async () => {
      await store.dump(makeResults('a1'));
      await store.dump(makeResults('a2'));
      await store.dump(makeResults('a3'));

      const loaded = await store.loadDumps();
      expect(loaded).toHaveLength(3);

      const ids = loaded.map((r) => r.id).sort();
      expect(ids).toEqual(['a1', 'a2', 'a3']);
    });

    it('handles empty directory gracefully', async () => {
      const loaded = await store.loadDumps();
      expect(loaded).toEqual([]);
    });

    it('handles non-JSON files in directory gracefully', async () => {
      // Write a non-JSON file.
      await fs.writeFile(path.join(tmpDir, 'readme.txt'), 'hello');
      // Write an invalid JSON file.
      await fs.writeFile(path.join(tmpDir, 'bad.json'), '{not valid json');
      // Write a valid result.
      await store.dump(makeResults('valid'));

      const loaded = await store.loadDumps();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('valid');
    });
  });

  // ------------------------------------------------------------------
  // remove()
  // ------------------------------------------------------------------

  describe('remove()', () => {
    it('deletes a specific dump file', async () => {
      await store.dump(makeResults('to-remove'));

      const filePath = path.join(tmpDir, 'to-remove.json');
      await expect(fs.stat(filePath)).resolves.toBeDefined();

      await store.remove('to-remove');
      await expect(fs.stat(filePath)).rejects.toThrow();
    });

    it('does not throw when file does not exist', async () => {
      await expect(store.remove('non-existent')).resolves.not.toThrow();
    });
  });

  // ------------------------------------------------------------------
  // evictOlderThan()
  // ------------------------------------------------------------------

  describe('evictOlderThan()', () => {
    it('removes old files based on mtime', async () => {
      await store.dump(makeResults('old-result'));

      const filePath = path.join(tmpDir, 'old-result.json');

      // Backdate the file mtime.
      const oldTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      await fs.utimes(filePath, oldTime, oldTime);

      const evicted = await store.evictOlderThan(60 * 60 * 1000); // 1 hour
      expect(evicted).toBe(1);
      await expect(fs.stat(filePath)).rejects.toThrow();
    });

    it('does not remove recent files', async () => {
      await store.dump(makeResults('recent-result'));

      const evicted = await store.evictOlderThan(60 * 60 * 1000); // 1 hour
      expect(evicted).toBe(0);

      const filePath = path.join(tmpDir, 'recent-result.json');
      await expect(fs.stat(filePath)).resolves.toBeDefined();
    });

    it('handles empty directory gracefully', async () => {
      const evicted = await store.evictOlderThan(1000);
      expect(evicted).toBe(0);
    });

    it('skips non-JSON files', async () => {
      await fs.writeFile(path.join(tmpDir, 'notes.txt'), 'hello');
      const oldTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
      await fs.utimes(path.join(tmpDir, 'notes.txt'), oldTime, oldTime);

      const evicted = await store.evictOlderThan(60 * 60 * 1000);
      expect(evicted).toBe(0);

      // The non-JSON file should still exist.
      await expect(fs.stat(path.join(tmpDir, 'notes.txt'))).resolves.toBeDefined();
    });
  });

  // ------------------------------------------------------------------
  // Directory creation
  // ------------------------------------------------------------------

  describe('directory handling', () => {
    it('creates the base directory if it does not exist', async () => {
      const nestedDir = path.join(tmpDir, 'sub', 'nested');
      const nestedStore = new ResultStore(nestedDir);

      await nestedStore.dump(makeResults('nested-test'));

      const files = await fs.readdir(nestedDir);
      expect(files).toContain('nested-test.json');
    });
  });
});
