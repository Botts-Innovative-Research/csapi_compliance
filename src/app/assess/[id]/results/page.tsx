'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import apiClient, { ApiError } from '@/services/api-client';
import { t } from '@/lib/i18n';
import SummaryDashboard from '@/components/results/summary-dashboard';
import ConformanceClassPanel from '@/components/results/conformance-class-panel';
import TestDetailDrawer from '@/components/results/test-detail-drawer';
import type {
  AssessmentResults,
  ConformanceClassResult,
  TestResult,
  HttpExchange,
  ClassStatus,
} from '@/lib/types';

type StatusFilter = 'all' | 'pass' | 'fail' | 'skip';

export default function ResultsPage() {
  const params = useParams();
  const assessmentId = params.id as string;

  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filter, setFilter] = useState<StatusFilter>('all');

  // Drawer state
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);
  const [selectedClass, setSelectedClass] = useState<ConformanceClassResult | null>(null);

  // Export state
  const [exportingJson, setExportingJson] = useState(false);

  // Fetch assessment results
  useEffect(() => {
    async function fetchResults() {
      try {
        const session = await apiClient.getAssessment(assessmentId);

        if (session.results) {
          // The API may return exchanges as a plain object rather than a Map
          const raw = session.results as AssessmentResults & {
            exchanges?: Record<string, HttpExchange> | Map<string, HttpExchange>;
          };

          let exchangeMap: Map<string, HttpExchange>;
          if (raw.exchanges instanceof Map) {
            exchangeMap = raw.exchanges;
          } else if (raw.exchanges && typeof raw.exchanges === 'object') {
            exchangeMap = new Map(Object.entries(raw.exchanges));
          } else {
            exchangeMap = new Map();
          }

          setResults({
            ...raw,
            exchanges: exchangeMap,
          });
        } else {
          setError(t('results.error.notReady'));
        }
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 404) {
          setError(t('results.error.notFound'));
        } else {
          setError(t('results.error.loadFailed'));
        }
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [assessmentId]);

  // Handle test click -> open drawer
  const handleTestClick = useCallback(
    (test: TestResult, classResult: ConformanceClassResult) => {
      setSelectedTest(test);
      setSelectedClass(classResult);
    },
    [],
  );

  // Handle drawer navigation
  const handleDrawerNavigate = useCallback((test: TestResult) => {
    setSelectedTest(test);
  }, []);

  // Handle drawer close
  const handleDrawerClose = useCallback(() => {
    setSelectedTest(null);
    setSelectedClass(null);
  }, []);

  // Handle JSON export
  async function handleExportJson() {
    setExportingJson(true);
    try {
      const blob = await apiClient.exportJson(assessmentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assessment-${assessmentId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Export error - could add toast notification
    } finally {
      setExportingJson(false);
    }
  }

  // Filter classes — show any class that contains tests matching the filter
  const filteredClasses = results
    ? filter === 'all'
      ? results.classes
      : results.classes.filter((c) =>
          c.tests.some((t) => t.status === filter),
        )
    : [];

  // Count tests by status for filter badges
  const testCounts = results
    ? {
        all: results.summary.totalTests,
        pass: results.summary.passed,
        fail: results.summary.failed,
        skip: results.summary.skipped,
      }
    : { all: 0, pass: 0, fail: 0, skip: 0 };

  const isPartial =
    results?.status === 'partial' || results?.status === 'cancelled';

  // Loading skeleton
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 rounded bg-gray-200" />
          <div className="h-48 rounded-lg bg-gray-200" />
          <div className="h-32 rounded-lg bg-gray-200" />
          <div className="h-32 rounded-lg bg-gray-200" />
          <div className="h-32 rounded-lg bg-gray-200" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !results) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-gray-200 bg-white py-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            {t('results.notFound.heading')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {error || t('results.notFound.fallback')}
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm font-medium text-blue-600 underline hover:text-blue-800"
          >
            {t('results.startNew')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('results.heading')}</h1>
        {results.endpointUrl && (
          <p className="mt-1 inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-mono text-gray-700">
            {results.endpointUrl}
          </p>
        )}

        {/* Meta Row */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {results.completedAt && (
            <span className="text-xs text-gray-500">
              {t('results.completed')}{' '}
              {new Date(results.completedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short',
              })}
            </span>
          )}
          <span className="text-xs text-gray-500">
            {t('results.duration', { duration: formatDuration(results.summary.durationMs) })}
          </span>
          <AssessmentStatusBadge status={results.status} />
        </div>

        {/* Export Buttons */}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            disabled={exportingJson}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {exportingJson ? t('results.exportJson.generating') : t('results.exportJson')}
          </button>
          <button
            type="button"
            disabled
            title={t('results.exportPdf.comingSoon')}
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-400"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('results.exportPdf')}
          </button>
        </div>
      </div>

      {/* Summary Dashboard */}
      <div className="mb-6">
        <SummaryDashboard
          summary={results.summary}
          endpointUrl={results.endpointUrl}
          startedAt={results.startedAt}
          completedAt={results.completedAt}
        />
      </div>

      {/* Partial Assessment Banner */}
      {isPartial && (
        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm text-amber-800">
              {t('results.partial.banner')}
            </p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="mb-4 flex gap-2" role="group" aria-label="Filter conformance classes by status">
        {(
          [
            { key: 'all' as StatusFilter, label: t('results.filter.all') },
            { key: 'pass' as StatusFilter, label: t('results.filter.passed') },
            { key: 'fail' as StatusFilter, label: t('results.filter.failed') },
            { key: 'skip' as StatusFilter, label: t('results.filter.skipped') },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === key
                ? 'bg-gray-900 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label} ({testCounts[key]})
          </button>
        ))}
      </div>

      {/* Conformance Class Accordion List */}
      <div className="space-y-3">
        {filteredClasses.length > 0 ? (
          filteredClasses.map((classResult) => (
            <ConformanceClassPanel
              key={classResult.classUri}
              classResult={classResult}
              defaultExpanded={classResult.status === 'fail' || classResult.status === 'skip'}
              onTestClick={handleTestClick}
              testStatusFilter={filter === 'all' ? undefined : filter}
            />
          ))
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white py-8 text-center">
            <p className="text-sm text-gray-500">
              {t('results.emptyFilter', {
                status: filter === 'pass'
                  ? 'passed'
                  : filter === 'fail'
                    ? 'failed'
                    : filter === 'skip'
                      ? 'skipped'
                      : '',
              })}
            </p>
            {filter !== 'all' && (
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="mt-2 text-sm font-medium text-blue-600 underline hover:text-blue-800"
              >
                {t('results.showAll')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Disclaimer (FR-38) */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs text-gray-500">
          {t('results.disclaimer')}
        </p>
      </div>

      {/* Test Detail Drawer */}
      <TestDetailDrawer
        test={selectedTest}
        classTests={selectedClass?.tests ?? []}
        className={selectedClass?.className ?? ''}
        exchanges={results.exchanges}
        onClose={handleDrawerClose}
        onNavigate={handleDrawerNavigate}
      />
    </div>
  );
}

/** Format milliseconds to human-readable duration. */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
}

/** Assessment status badge with appropriate color. */
function AssessmentStatusBadge({
  status,
}: {
  status: string;
}) {
  const styles: Record<string, string> = {
    completed: 'bg-green-50 text-green-700 border-green-200',
    partial: 'bg-amber-50 text-amber-700 border-amber-200',
    cancelled: 'bg-amber-50 text-amber-700 border-amber-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    running: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  const labels: Record<string, string> = {
    completed: t('results.status.completed'),
    partial: t('results.status.partial'),
    cancelled: t('results.status.cancelled'),
    error: t('results.status.error'),
    running: t('results.status.running'),
  };

  const style = styles[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  const label = labels[status] || status;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}
