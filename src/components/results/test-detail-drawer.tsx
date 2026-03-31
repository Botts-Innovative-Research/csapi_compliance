'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { TestResult, HttpExchange } from '@/lib/types';
import HttpExchangeViewer from './http-exchange-viewer';
import { t } from '@/lib/i18n';

interface TestDetailDrawerProps {
  /** The test result to display. Null means drawer is closed. */
  test: TestResult | null;
  /** All tests in the same conformance class, for previous/next navigation. */
  classTests: TestResult[];
  /** Class name for the position indicator. */
  className: string;
  /** Map of exchange ID to HttpExchange for displaying request/response details. */
  exchanges: Map<string, HttpExchange>;
  /** Called when the drawer should close. */
  onClose: () => void;
  /** Called when user navigates to a different test. */
  onNavigate: (test: TestResult) => void;
}

/** Status badge with icon + text + color (triple redundancy per WCAG). */
function StatusBadge({ status }: { status: 'pass' | 'fail' | 'skip' }) {
  const config = {
    pass: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-600',
      label: t('drawer.status.pass'),
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    fail: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-600',
      label: t('drawer.status.fail'),
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    skip: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-500',
      label: t('drawer.status.skip'),
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const c = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${c.bg} ${c.border} ${c.text}`}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

export default function TestDetailDrawer({
  test,
  classTests,
  className,
  exchanges,
  onClose,
  onNavigate,
}: TestDetailDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Current test index for navigation
  const currentIndex = test ? classTests.findIndex((t) => t.requirementUri === test.requirementUri) : -1;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < classTests.length - 1;

  // Focus trap: save trigger element and focus the close button when drawer opens
  useEffect(() => {
    if (test) {
      triggerRef.current = document.activeElement;
      closeButtonRef.current?.focus();
    } else if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [test]);

  // Close on Escape key and trap focus within drawer
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Focus trap: cycle Tab within the drawer
      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (test) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [test, handleKeyDown]);

  if (!test) return null;

  // Resolve exchanges for this test
  const testExchanges = test.exchangeIds
    .map((id) => exchanges.get(id))
    .filter((e): e is HttpExchange => e !== undefined);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Test detail: ${test.testName}`}
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-xl transition-transform duration-300 ease-out sm:w-[480px] lg:w-[640px]"
      >
        {/* Drawer Header */}
        <div className="flex items-start justify-between border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="min-w-0 flex-1 space-y-2">
            <StatusBadge status={test.status} />
            <h2 className="text-lg font-semibold text-gray-900">{test.testName}</h2>
            <p className="truncate font-mono text-xs text-gray-500">
              {test.requirementUri}
            </p>
            {test.conformanceUri && (
              <p className="truncate font-mono text-xs text-gray-400">
                {test.conformanceUri}
              </p>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="ml-4 shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900"
            aria-label={t('drawer.close')}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {/* Failure Message */}
          {test.status === 'fail' && test.failureMessage && (
            <div className="mb-4">
              <h3 className="mb-1 text-sm font-semibold text-gray-700">{t('drawer.failureReason')}</h3>
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-800">{test.failureMessage}</p>
              </div>
            </div>
          )}

          {/* Skip Reason */}
          {test.status === 'skip' && test.skipReason && (
            <div className="mb-4">
              <h3 className="mb-1 text-sm font-semibold text-gray-700">{t('drawer.skipReason')}</h3>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <p className="text-sm text-gray-700">{test.skipReason}</p>
              </div>
            </div>
          )}

          {/* HTTP Exchanges */}
          {testExchanges.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">
                {t('drawer.httpExchanges', { plural: testExchanges.length > 1 ? 's' : '' })}
              </h3>
              {testExchanges.map((exchange) => (
                <div key={exchange.id} className="rounded-md border border-gray-200">
                  <HttpExchangeViewer
                    exchange={exchange}
                    defaultTab={test.status === 'fail' ? 'response' : 'request'}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-400">{t('drawer.noExchanges')}</p>
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
          <button
            type="button"
            disabled={!hasPrevious}
            onClick={() => hasPrevious && onNavigate(classTests[currentIndex - 1])}
            aria-label="Previous test"
            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">{t('drawer.previous')}</span>
          </button>

          <span className="text-xs text-gray-500">
            {t('drawer.position', { current: currentIndex + 1, total: classTests.length, className })}
          </span>

          <button
            type="button"
            disabled={!hasNext}
            onClick={() => hasNext && onNavigate(classTests[currentIndex + 1])}
            aria-label="Next test"
            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="hidden sm:inline">{t('drawer.next')}</span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
