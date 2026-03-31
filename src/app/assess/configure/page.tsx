'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ConformanceClassSelector from '@/components/assessment-wizard/conformance-class-selector';
import AuthConfigForm from '@/components/assessment-wizard/auth-config';
import RunConfigForm from '@/components/assessment-wizard/run-config';
import { mapConformanceClasses } from '@/engine/conformance-mapper';
import type { DeclaredConformanceClass } from '@/engine/conformance-mapper';
import type { AuthConfig, RunConfig } from '@/lib/types';
import { ENGINE_DEFAULTS } from '@/lib/constants';
import apiClient, { ApiError } from '@/services/api-client';
import { t } from '@/lib/i18n';

interface DiscoveryResult {
  landingPage: Record<string, unknown>;
  conformsTo: string[];
  collectionIds: string[];
  links: Array<{ rel: string; href: string; type?: string; title?: string }>;
  apiDefinitionUrl?: string;
}

/** Wrapper to provide Suspense boundary for useSearchParams. */
export default function ConfigurePageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 rounded bg-gray-200" />
            <div className="h-24 rounded-lg bg-gray-200" />
            <div className="h-64 rounded-lg bg-gray-200" />
            <div className="h-32 rounded-lg bg-gray-200" />
          </div>
        </div>
      }
    >
      <ConfigurePage />
    </Suspense>
  );
}

function ConfigurePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Conformance class selection state
  const [selectedUris, setSelectedUris] = useState<string[]>([]);
  const [destructiveConfirmed, setDestructiveConfirmed] = useState(false);

  // Auth state
  const [auth, setAuth] = useState<AuthConfig>({ type: 'none' });

  // Run config state
  const [runConfig, setRunConfig] = useState<RunConfig>({
    timeoutMs: ENGINE_DEFAULTS.timeoutMs,
    concurrency: ENGINE_DEFAULTS.concurrency,
  });

  // Starting state
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Load discovery result from sessionStorage
  useEffect(() => {
    if (!sessionId) {
      setError(t('config.error.noSession'));
      setLoading(false);
      return;
    }

    try {
      const stored = sessionStorage.getItem(`discovery:${sessionId}`);
      if (!stored) {
        setError(t('config.error.noDiscovery'));
        setLoading(false);
        return;
      }

      const data: DiscoveryResult = JSON.parse(stored);
      setDiscovery(data);

      // Pre-select all supported classes
      const mapped = mapConformanceClasses(data.conformsTo);
      const supported = mapped.filter((c) => c.supported).map((c) => c.uri);
      setSelectedUris(supported);
    } catch {
      setError(t('config.error.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Mapped conformance classes
  const conformanceClasses: DeclaredConformanceClass[] = useMemo(() => {
    if (!discovery) return [];
    return mapConformanceClasses(discovery.conformsTo);
  }, [discovery]);

  // Check if any mutating class is selected
  const anyMutatingSelected = useMemo(
    () =>
      selectedUris.some(
        (uri) =>
          uri.includes('/conf/create-replace-delete') ||
          uri.includes('/conf/update'),
      ),
    [selectedUris],
  );

  // Can start?
  const canStart =
    selectedUris.length > 0 &&
    (!anyMutatingSelected || destructiveConfirmed) &&
    !isStarting;

  // Endpoint URL from discovery landing page
  const endpointUrl = useMemo(() => {
    if (!discovery?.landingPage) return '';
    const selfLink = discovery.links?.find((l) => l.rel === 'self');
    return selfLink?.href || '';
  }, [discovery]);

  async function handleStart() {
    if (!sessionId) return;

    setIsStarting(true);
    setStartError(null);

    try {
      const result = await apiClient.startAssessment(sessionId, {
        conformanceClasses: selectedUris,
        auth: auth.type !== 'none' ? auth : undefined,
        config: runConfig,
      });

      router.push(`/assess/${result.id}/progress`);
    } catch (err) {
      if (err instanceof ApiError) {
        setStartError(err.message);
      } else {
        setStartError(t('config.error.startFailed'));
      }
    } finally {
      setIsStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 rounded bg-gray-200" />
          <div className="h-24 rounded-lg bg-gray-200" />
          <div className="h-64 rounded-lg bg-gray-200" />
          <div className="h-32 rounded-lg bg-gray-200" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center" role="alert">
          <p className="text-sm text-red-800">{error}</p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-medium text-blue-600 underline hover:text-blue-800"
          >
            {t('config.startNewAssessment')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; {t('config.backLink')}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {t('config.heading')}
        </h1>
        {endpointUrl && (
          <p className="mt-1 inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-mono text-gray-700">
            {endpointUrl}
          </p>
        )}
      </div>

      {/* Discovery Summary */}
      {discovery && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatItem
              label={t('config.discovery.landingPage')}
              value={discovery.landingPage ? t('config.discovery.found') : t('config.discovery.notFound')}
              ok={!!discovery.landingPage}
            />
            <StatItem
              label={t('config.discovery.conformanceEndpoint')}
              value={discovery.conformsTo.length > 0 ? t('config.discovery.found') : t('config.discovery.notFound')}
              ok={discovery.conformsTo.length > 0}
            />
            <StatItem
              label={t('config.discovery.collectionsFound')}
              value={String(discovery.collectionIds.length)}
              ok={true}
            />
            <StatItem
              label={t('config.discovery.conformanceClasses')}
              value={String(discovery.conformsTo.length)}
              ok={discovery.conformsTo.length > 0}
            />
          </div>
        </div>
      )}

      {/* Conformance Class Selector */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <ConformanceClassSelector
          classes={conformanceClasses}
          selectedUris={selectedUris}
          onSelectionChange={setSelectedUris}
          destructiveConfirmed={destructiveConfirmed}
          onDestructiveConfirmChange={setDestructiveConfirmed}
        />
      </div>

      {/* Authentication */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white">
        <CollapsibleSection title={t('config.section.auth')} defaultOpen={false}>
          <AuthConfigForm auth={auth} onChange={setAuth} />
        </CollapsibleSection>
      </div>

      {/* Run Config */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white">
        <CollapsibleSection title={t('config.section.advanced')} defaultOpen={false}>
          <RunConfigForm config={runConfig} onChange={setRunConfig} />
        </CollapsibleSection>
      </div>

      {/* Action Bar */}
      <div className="sticky bottom-0 border-t border-gray-200 bg-white py-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-600">
            {t('config.selectedCount', { count: selectedUris.length, plural: selectedUris.length !== 1 ? 'es' : '' })}
          </p>

          {startError && (
            <p className="text-sm text-red-600" role="alert">{startError}</p>
          )}

          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart}
            className="rounded-md bg-gray-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isStarting ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {t('config.starting')}
              </span>
            ) : (
              t('config.startAssessment')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Discovery summary stat item. */
function StatItem({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1">
        {ok ? (
          <svg
            className="h-4 w-4 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          <svg
            className="h-4 w-4 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        )}
        <span className="text-sm font-semibold text-gray-900">{value}</span>
      </div>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
    </div>
  );
}

/** Simple collapsible section. */
function CollapsibleSection({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        <svg
          className={`h-5 w-5 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
