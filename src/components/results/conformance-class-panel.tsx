'use client';

import { useState } from 'react';
import type { ConformanceClassResult, TestResult } from '@/lib/types';

interface ConformanceClassPanelProps {
  classResult: ConformanceClassResult;
  /** If true, the panel starts expanded (e.g., for failed classes). */
  defaultExpanded?: boolean;
  /** Called when a test row is clicked to open the detail drawer. */
  onTestClick: (test: TestResult, classResult: ConformanceClassResult) => void;
}

/** Status icon with triple redundancy: icon shape + text + color. */
function StatusIcon({ status, size = 'md' }: { status: 'pass' | 'fail' | 'skip'; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  if (status === 'pass') {
    return (
      <svg className={`${sizeClass} text-green-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }

  if (status === 'fail') {
    return (
      <svg className={`${sizeClass} text-red-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }

  return (
    <svg className={`${sizeClass} text-gray-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function StatusText({ status }: { status: 'pass' | 'fail' | 'skip' }) {
  const config = {
    pass: { color: 'text-green-600', label: 'Pass' },
    fail: { color: 'text-red-600', label: 'Fail' },
    skip: { color: 'text-gray-500', label: 'Skip' },
  };
  const c = config[status];
  return <span className={`text-xs font-medium ${c.color}`}>{c.label}</span>;
}

export default function ConformanceClassPanel({
  classResult,
  defaultExpanded = false,
  onTestClick,
}: ConformanceClassPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const { className: name, classUri, status, tests, counts } = classResult;

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={isExpanded}
        aria-controls={`class-panel-${classUri}`}
      >
        <StatusIcon status={status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-gray-900">{name}</span>
            <StatusText status={status} />
          </div>
          <p className="truncate font-mono text-xs text-gray-400">{classUri}</p>
        </div>
        <span className="shrink-0 text-xs text-gray-500">
          {counts.pass}/{counts.pass + counts.fail + counts.skip} passed
        </span>
        <svg
          className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Body: Test List */}
      {isExpanded && (
        <div
          id={`class-panel-${classUri}`}
          className="border-t border-gray-200"
        >
          <div className="divide-y divide-gray-100">
            {tests.map((test) => (
              <TestRow
                key={test.requirementUri}
                test={test}
                onTestClick={() => onTestClick(test, classResult)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Individual test result row within the accordion. */
function TestRow({
  test,
  onTestClick,
}: {
  test: TestResult;
  onTestClick: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
      <StatusIcon status={test.status} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-gray-800">{test.testName}</span>
          <StatusText status={test.status} />
        </div>
        <p className="truncate font-mono text-xs text-gray-400">{test.requirementUri}</p>
        {test.status === 'fail' && test.failureMessage && (
          <p className="mt-0.5 truncate text-xs text-red-600" title={test.failureMessage}>
            {test.failureMessage}
          </p>
        )}
        {test.status === 'skip' && test.skipReason && (
          <p className="mt-0.5 truncate text-xs text-gray-500" title={test.skipReason}>
            {test.skipReason}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTestClick();
        }}
        aria-label={`View details for ${test.testName}`}
        className="shrink-0 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
      >
        Details
      </button>
    </div>
  );
}
