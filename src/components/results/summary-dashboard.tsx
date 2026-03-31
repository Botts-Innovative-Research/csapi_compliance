'use client';

import type { AssessmentSummary } from '@/lib/types';
import { t } from '@/lib/i18n';

interface SummaryDashboardProps {
  summary: AssessmentSummary;
  endpointUrl: string;
  startedAt: string;
  completedAt?: string;
}

function getComplianceColor(percent: number): string {
  if (percent >= 90) return 'text-green-600';
  if (percent >= 50) return 'text-amber-600';
  return 'text-red-600';
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return iso;
  }
}

export default function SummaryDashboard({
  summary,
  endpointUrl,
  startedAt,
  completedAt,
}: SummaryDashboardProps) {
  const complianceColor = getComplianceColor(summary.compliancePercent);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {/* Compliance Score */}
      <div className="mb-6 text-center">
        <div className={`text-6xl font-bold ${complianceColor}`}>
          {Math.round(summary.compliancePercent)}%
        </div>
        <p className="mt-1 text-sm font-medium text-gray-500">{t('dashboard.overallCompliance')}</p>
      </div>

      {/* Stat Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label={t('dashboard.totalTests')}
          count={summary.totalTests}
          iconColor="text-gray-500"
          bgColor="bg-gray-50"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label={t('dashboard.passed')}
          count={summary.passed}
          iconColor="text-green-600"
          bgColor="bg-green-50"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label={t('dashboard.failed')}
          count={summary.failed}
          iconColor="text-red-600"
          bgColor="bg-red-50"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label={t('dashboard.skipped')}
          count={summary.skipped}
          iconColor="text-gray-500"
          bgColor="bg-gray-50"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Class Summary Bar */}
      {summary.totalClasses > 0 && (
        <div className="mb-6">
          <div
            className="mb-2 flex h-3 overflow-hidden rounded-full bg-gray-100"
            role="img"
            aria-label={`Conformance class results: ${summary.classesPassed} passed, ${summary.classesFailed} failed, ${summary.classesSkipped} skipped out of ${summary.totalClasses} total`}
          >
            {summary.classesPassed > 0 && (
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${(summary.classesPassed / summary.totalClasses) * 100}%` }}
                title={`${summary.classesPassed} passed`}
              />
            )}
            {summary.classesFailed > 0 && (
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${(summary.classesFailed / summary.totalClasses) * 100}%` }}
                title={`${summary.classesFailed} failed`}
              />
            )}
            {summary.classesSkipped > 0 && (
              <div
                className="bg-gray-400 transition-all"
                style={{ width: `${(summary.classesSkipped / summary.totalClasses) * 100}%` }}
                title={`${summary.classesSkipped} skipped`}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" aria-hidden="true" />
              {t('dashboard.classesPassed', { count: summary.classesPassed })}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden="true" />
              {t('dashboard.classesFailed', { count: summary.classesFailed })}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-400" aria-hidden="true" />
              {t('dashboard.classesSkipped', { count: summary.classesSkipped })}
            </span>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="border-t border-gray-200 pt-4">
        <div className="grid grid-cols-1 gap-2 text-xs text-gray-500 sm:grid-cols-2">
          <div>
            <span className="font-medium text-gray-600">{t('dashboard.meta.endpoint')}</span>{' '}
            <span className="break-all font-mono">{endpointUrl}</span>
          </div>
          <div>
            <span className="font-medium text-gray-600">{t('dashboard.meta.duration')}</span>{' '}
            {formatDuration(summary.durationMs)}
          </div>
          <div>
            <span className="font-medium text-gray-600">{t('dashboard.meta.started')}</span>{' '}
            {formatTimestamp(startedAt)}
          </div>
          {completedAt && (
            <div>
              <span className="font-medium text-gray-600">{t('dashboard.meta.completed')}</span>{' '}
              {formatTimestamp(completedAt)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  count,
  icon,
  iconColor,
  bgColor,
}: {
  label: string;
  count: number;
  icon: React.ReactNode;
  iconColor: string;
  bgColor: string;
}) {
  return (
    <div className={`rounded-lg border border-gray-200 p-3 ${bgColor}`}>
      <div className="flex items-center gap-2">
        <span className={iconColor}>{icon}</span>
        <span className="text-2xl font-bold text-gray-900">{count}</span>
      </div>
      <p className="mt-1 text-xs font-medium text-gray-500">{label}</p>
    </div>
  );
}
