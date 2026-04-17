// REQ-SCHEMA-001 (SCENARIO-SCHEMA-REF-001): every bundled OGC schema has
// all $ref targets resolved — either to a fragment within the same file
// (starts with '#') or to another bundled schema. This integrity test is
// the Gate 1 invariant from `_bmad/github-issues-audit.md` item 1 and the
// mechanical check for issue #4 (https://github.com/... /issues/4).
//
// If this test fails, re-run `npx tsx scripts/fetch-schemas.ts` to
// repopulate the $ref closure, or audit the offending ref manually.

import { describe, it, expect } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname, normalize, resolve } from 'node:path';

const SCHEMAS_ROOT = resolve(__dirname, '..', '..', '..', 'schemas');

/**
 * Recursively collect every .json file under the schemas directory.
 * Returns paths relative to SCHEMAS_ROOT using posix separators so the
 * set membership check matches the $ref resolution below.
 */
async function collectJsonFiles(rootDir: string): Promise<Set<string>> {
  const out = new Set<string>();
  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        const rel = full.slice(rootDir.length + 1).split(/[\\/]/).join('/');
        out.add(rel);
      }
    }
  }
  await walk(rootDir);
  return out;
}

/** Walk an arbitrary JSON value and yield every `$ref` string literal. */
function* walkRefs(node: unknown): Generator<string> {
  if (Array.isArray(node)) {
    for (const item of node) yield* walkRefs(item);
    return;
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    for (const [key, value] of Object.entries(obj)) {
      if (key === '$ref' && typeof value === 'string') {
        yield value;
      } else {
        yield* walkRefs(value);
      }
    }
  }
}

/**
 * Collect $id values (self-identifiers) of every bundled schema. Some refs
 * use an absolute IRI that matches a bundled schema's $id — we treat those
 * as resolved when the IRI matches a known $id.
 */
async function collectSelfIds(
  filesRelative: Set<string>,
): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const rel of filesRelative) {
    const abs = join(SCHEMAS_ROOT, rel);
    const content = JSON.parse(await readFile(abs, 'utf-8')) as Record<
      string,
      unknown
    >;
    const id = content.$id;
    if (typeof id === 'string') ids.add(id);
  }
  return ids;
}

describe('schema bundle integrity (REQ-SCHEMA-001)', () => {
  it('every $ref resolves to a bundled file, a fragment in the same file, or a bundled $id (SCENARIO-SCHEMA-REF-001)', async () => {
    const files = await collectJsonFiles(SCHEMAS_ROOT);
    expect(files.size).toBeGreaterThan(50);

    const bundledIds = await collectSelfIds(files);

    const unresolved: Array<{ file: string; ref: string; target: string }> = [];

    for (const rel of files) {
      const abs = join(SCHEMAS_ROOT, rel);
      const schema = JSON.parse(await readFile(abs, 'utf-8')) as unknown;

      for (const ref of walkRefs(schema)) {
        // Split off the fragment
        const hashIdx = ref.indexOf('#');
        const refPath = hashIdx >= 0 ? ref.slice(0, hashIdx) : ref;

        // (b) Pure fragment ref — always local.
        if (refPath === '') continue;

        if (/^https?:/i.test(refPath)) {
          // Absolute URL ref — resolved if it matches a bundled $id.
          if (!bundledIds.has(refPath)) {
            unresolved.push({ file: rel, ref, target: refPath });
          }
          continue;
        }

        // (a) Relative path ref — resolve against the containing file's
        // directory using posix semantics.
        const resolved = normalize(
          `${dirname(rel)}/${refPath}`,
        )
          .split(/[\\/]/)
          .join('/');

        if (!files.has(resolved)) {
          unresolved.push({ file: rel, ref, target: resolved });
        }
      }
    }

    expect(
      unresolved,
      `Unresolved $refs found in schema bundle:\n${unresolved
        .map((u) => `  ${u.file} -> ${u.ref} (target: ${u.target})`)
        .join('\n')}`,
    ).toEqual([]);
  });
});
