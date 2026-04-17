// SCENARIO coverage (WARN-003 traceability sweep 2026-04-17T19:35Z):
//   No direct SCENARIO-* coverage — i18n is translation-table polish, not
//   part of any of the 7 capability specs. Tagged here explicitly so a
//   reviewer greping for untagged test files gets zero false positives.

import { describe, it, expect } from 'vitest';
import { t } from '@/lib/i18n';

describe('t() i18n string accessor', () => {
  it('returns the string for a known key', () => {
    expect(t('app.title')).toBe('CS API Compliance Assessor');
  });

  it('returns the key itself for unknown keys', () => {
    expect(t('nonexistent.key.that.does.not.exist')).toBe(
      'nonexistent.key.that.does.not.exist',
    );
  });

  it('interpolates a single {placeholder} value', () => {
    const result = t('progress.elapsed', { time: '2m 30s' });
    expect(result).toBe('Elapsed: 2m 30s');
  });

  it('interpolates multiple placeholders', () => {
    const result = t('drawer.position', {
      current: 3,
      total: 10,
      className: 'Core',
    });
    expect(result).toBe('3 of 10 in Core');
  });

  it('interpolates numeric values as strings', () => {
    const result = t('dashboard.classesPassed', { count: 7 });
    expect(result).toBe('7 Passed');
  });

  it('leaves unmatched placeholders intact when no params provided', () => {
    const result = t('progress.elapsed');
    expect(result).toBe('Elapsed: {time}');
  });
});
