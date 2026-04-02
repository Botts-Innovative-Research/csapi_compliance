'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSSEClient } from '@/services/sse-client';
import apiClient from '@/services/api-client';
import type { ProgressEventData, TestStatus } from '@/lib/types';
import { t } from '@/lib/i18n';

interface TestLogEntry {
  testName: string;
  status: TestStatus;
  timestamp: number;
}

export default function ProgressPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  // Progress state
  const [completedTests, setCompletedTests] = useState(0);
  const [totalTests, setTotalTests] = useState(0);
  const [passedCount, setPassedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [currentClassName, setCurrentClassName] = useState<string | null>(null);
  const [currentTestName, setCurrentTestName] = useState<string | null>(null);
  const [endpointUrl, setEndpointUrl] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [testLog, setTestLog] = useState<TestLogEntry[]>([]);
  const [logExpanded, setLogExpanded] = useState(false);

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'reconnecting' | 'polling' | 'failed'
  >('connecting');

  // Cancel state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const sseRef = useRef<{ close: () => void } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  // Fetch assessment metadata (endpoint URL)
  useEffect(() => {
    apiClient.getAssessment(assessmentId).then((session) => {
      setEndpointUrl(session.endpointUrl);
    }).catch(() => {
      // If we can't fetch metadata, that's OK - SSE will provide progress
    });
  }, [assessmentId]);

  // Elapsed time timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Polling fallback when SSE connection fails
  const startPolling = useCallback(() => {
    if (pollRef.current) return; // already polling

    const poll = async () => {
      try {
        const session = await apiClient.getAssessment(assessmentId);
        if (session.status === 'completed' || session.status === 'cancelled' || session.status === 'partial') {
          if (timerRef.current) clearInterval(timerRef.current);
          if (pollRef.current) clearInterval(pollRef.current);
          sseRef.current?.close();
          router.push(`/assess/${assessmentId}/results`);
        } else if (session.status === 'error') {
          setConnectionStatus('failed');
          if (pollRef.current) clearInterval(pollRef.current);
        }
        // If still 'running' or 'discovering', keep polling
      } catch {
        // 404 = session gone, show failed state
        setConnectionStatus('failed');
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    };

    // Poll immediately, then every 3 seconds
    poll();
    pollRef.current = setInterval(poll, 3000);
  }, [assessmentId, router]);

  // SSE connection
  useEffect(() => {
    const client = createSSEClient(assessmentId, {
      onAssessmentStarted(data: ProgressEventData) {
        setConnectionStatus('connected');
        if (data.totalTests) setTotalTests(data.totalTests);
      },

      onClassStarted(data: ProgressEventData) {
        setConnectionStatus('connected');
        if (data.className) setCurrentClassName(data.className);
      },

      onTestStarted(data: ProgressEventData) {
        if (data.testName) setCurrentTestName(data.testName);
      },

      onTestCompleted(data: ProgressEventData) {
        setConnectionStatus('connected');
        if (data.completedTests !== undefined) setCompletedTests(data.completedTests);
        if (data.totalTests !== undefined) setTotalTests(data.totalTests);

        // Increment status counters
        if (data.status === 'pass') setPassedCount((p) => p + 1);
        if (data.status === 'fail') setFailedCount((p) => p + 1);
        if (data.status === 'skip') setSkippedCount((p) => p + 1);

        // Add to test log
        if (data.testName && data.status) {
          setTestLog((prev) => [
            { testName: data.testName!, status: data.status!, timestamp: Date.now() },
            ...prev,
          ]);
        }
      },

      onClassCompleted(_data: ProgressEventData) {
        // No specific visual change needed
      },

      onAssessmentCompleted(_data: ProgressEventData) {
        if (timerRef.current) clearInterval(timerRef.current);
        router.push(`/assess/${assessmentId}/results`);
      },

      onError(_error: Event) {
        // Only mark failed if we're not already polling
        setConnectionStatus((prev) => prev === 'polling' ? prev : 'failed');
      },

      onReconnecting() {
        setConnectionStatus('reconnecting');
      },

      onReconnected() {
        setConnectionStatus('connected');
        // Stop polling if SSE reconnects
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      },

      onReconnectFailed() {
        // Fall back to polling the assessment status API
        setConnectionStatus('polling');
        startPolling();
      },
    });

    sseRef.current = client;

    return () => {
      client.close();
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [assessmentId, router, startPolling]);

  // Cancel handler
  const handleCancel = useCallback(async () => {
    setIsCancelling(true);
    try {
      await apiClient.cancelAssessment(assessmentId);
      if (timerRef.current) clearInterval(timerRef.current);
      sseRef.current?.close();
      router.push(`/assess/${assessmentId}/results`);
    } catch {
      setIsCancelling(false);
      setShowCancelDialog(false);
    }
  }, [assessmentId, router]);

  const percentage = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;

  function formatElapsed(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('progress.heading')}</h1>
        {endpointUrl && (
          <p className="mt-1 inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-mono text-gray-700">
            {endpointUrl}
          </p>
        )}
      </div>

      {/* Connection Warning */}
      {(connectionStatus === 'reconnecting' || connectionStatus === 'polling') && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3" role="status">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 animate-spin text-amber-600" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-amber-800">
              {connectionStatus === 'polling'
                ? t('progress.polling')
                : t('progress.reconnecting')}
            </p>
          </div>
        </div>
      )}

      {connectionStatus === 'failed' && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3" role="alert">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm text-red-800">
              {t('progress.connectionLost')}
            </p>
          </div>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => router.push(`/assess/${assessmentId}/results`)}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              {t('progress.viewResults')}
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {t('progress.startNew')}
            </button>
          </div>
        </div>
      )}

      {/* Progress Card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {/* Progress Bar */}
        <div className="mb-4">
          <div
            className="relative h-4 w-full overflow-hidden rounded-full bg-gray-100"
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Assessment progress: ${percentage}% complete, ${completedTests} of ${totalTests} tests`}
          >
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${percentage}%` }}
            >
              {/* Pulse animation on leading edge */}
              <div className="absolute right-0 top-0 h-full w-2 animate-pulse rounded-full bg-blue-300" />
            </div>
          </div>
          <p className="mt-1 text-right text-sm font-semibold text-gray-700">{percentage}%</p>
        </div>

        {/* Progress Stats */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">
              {completedTests} / {totalTests}
            </p>
            <p className="text-xs text-gray-500">{t('progress.testsCompleted')}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-green-600">{passedCount}</p>
            <p className="text-xs text-gray-500">{t('progress.passed')}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-red-600">{failedCount}</p>
            <p className="text-xs text-gray-500">{t('progress.failed')}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-500">{skippedCount}</p>
            <p className="text-xs text-gray-500">{t('progress.skipped')}</p>
          </div>
        </div>

        {/* Current Activity */}
        <div className="mb-4 rounded-md bg-gray-50 px-4 py-3" aria-live="polite">
          {connectionStatus === 'connecting' && !currentClassName ? (
            <p className="text-sm text-gray-500">{t('progress.connecting')}</p>
          ) : (
            <>
              {currentClassName && (
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{t('progress.testing')}</span> {currentClassName}
                </p>
              )}
              {currentTestName && (
                <p className="mt-0.5 truncate font-mono text-xs text-gray-500">
                  {currentTestName}
                </p>
              )}
            </>
          )}
        </div>

        {/* Elapsed Time */}
        <p className="text-xs text-gray-500">
          {t('progress.elapsed', { time: formatElapsed(elapsedSeconds) })}
        </p>
      </div>

      {/* Cancel Button */}
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setShowCancelDialog(true)}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        >
          {t('progress.cancel')}
        </button>
      </div>

      {/* Test Log (collapsible) */}
      {testLog.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setLogExpanded(!logExpanded)}
            className="flex w-full items-center justify-between rounded-t-lg border border-gray-200 bg-white px-4 py-3 text-left"
            aria-expanded={logExpanded}
          >
            <span className="text-sm font-semibold text-gray-700">{t('progress.testLog')}</span>
            <svg
              className={`h-5 w-5 text-gray-400 transition-transform ${logExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {logExpanded && (
            <div className="max-h-64 overflow-y-auto rounded-b-lg border border-t-0 border-gray-200 bg-white">
              {testLog.map((entry, i) => (
                <div
                  key={`${entry.testName}-${i}`}
                  className="flex items-center gap-2 border-b border-gray-50 px-4 py-1.5 last:border-0"
                >
                  {entry.status === 'pass' && (
                    <svg className="h-4 w-4 shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {entry.status === 'fail' && (
                    <svg className="h-4 w-4 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {entry.status === 'skip' && (
                    <svg className="h-4 w-4 shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span className="text-xs text-gray-600">
                    [{entry.status.toUpperCase()}]
                  </span>
                  <span className="truncate font-mono text-xs text-gray-700">
                    {entry.testName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => !isCancelling && setShowCancelDialog(false)}
            aria-hidden="true"
          />
          {/* Dialog */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Cancel assessment confirmation"
          >
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-gray-900">{t('progress.cancelConfirm.title')}</h2>
              <p className="mt-2 text-sm text-gray-600">
                {t('progress.cancelConfirm.body')}
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCancelDialog(false)}
                  disabled={isCancelling}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('progress.cancelConfirm.continue')}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isCancelling ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {t('progress.cancelling')}
                    </span>
                  ) : (
                    t('progress.cancelConfirm.cancel')
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
