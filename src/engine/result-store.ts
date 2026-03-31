// File-backed persistence for completed assessment results.

import fs from 'node:fs/promises';
import path from 'node:path';
import type { AssessmentResults, HttpExchange } from '@/lib/types';

/**
 * Serialise an AssessmentResults to a plain JSON-safe object.
 *
 * The `exchanges` field is a Map, which JSON.stringify ignores.  We convert it
 * to an array of [key, value] entries so it round-trips correctly.
 */
function serialise(results: AssessmentResults): string {
  return JSON.stringify(results, (_key, value) => {
    if (value instanceof Map) {
      return { __mapEntries: Array.from(value.entries()) };
    }
    return value;
  }, 2);
}

/**
 * Deserialise a JSON string back to an AssessmentResults, restoring Maps.
 */
function deserialise(json: string): AssessmentResults {
  return JSON.parse(json, (_key, value) => {
    if (value && typeof value === 'object' && Array.isArray(value.__mapEntries)) {
      return new Map<string, HttpExchange>(value.__mapEntries);
    }
    return value;
  }) as AssessmentResults;
}

/**
 * File-backed result store for completed assessments.
 *
 * Each completed assessment is dumped as a JSON file named `{assessmentId}.json`
 * in the configured base directory.  On startup the store can reload all dumps
 * for crash recovery.
 */
export class ResultStore {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /** Ensure the base directory exists. */
  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.basePath, { recursive: true });
  }

  /** Dump a completed assessment to a JSON file. */
  async dump(results: AssessmentResults): Promise<void> {
    await this.ensureDir();
    const filePath = path.join(this.basePath, `${results.id}.json`);
    await fs.writeFile(filePath, serialise(results), 'utf-8');
  }

  /** Load all dumps from the base path (for crash recovery on startup). */
  async loadDumps(): Promise<AssessmentResults[]> {
    await this.ensureDir();
    const entries = await fs.readdir(this.basePath);
    const results: AssessmentResults[] = [];

    for (const entry of entries) {
      if (!entry.endsWith('.json')) {
        continue;
      }
      try {
        const filePath = path.join(this.basePath, entry);
        const content = await fs.readFile(filePath, 'utf-8');
        results.push(deserialise(content));
      } catch {
        // Skip files that cannot be parsed.
      }
    }

    return results;
  }

  /** Remove a dump file by assessment ID. */
  async remove(id: string): Promise<void> {
    const filePath = path.join(this.basePath, `${id}.json`);
    try {
      await fs.unlink(filePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  /** Remove dumps older than maxAge milliseconds. Returns the count removed. */
  async evictOlderThan(maxAgeMs: number): Promise<number> {
    await this.ensureDir();
    const entries = await fs.readdir(this.basePath);
    const now = Date.now();
    let evicted = 0;

    for (const entry of entries) {
      if (!entry.endsWith('.json')) {
        continue;
      }
      const filePath = path.join(this.basePath, entry);
      try {
        const stat = await fs.stat(filePath);
        if (now - stat.mtimeMs > maxAgeMs) {
          await fs.unlink(filePath);
          evicted++;
        }
      } catch {
        // Skip files that cannot be stat'd or removed.
      }
    }

    return evicted;
  }
}
