'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import URLInputForm from '@/components/assessment-wizard/url-input-form';
import AuthConfigForm from '@/components/assessment-wizard/auth-config';
import apiClient, { ApiError } from '@/services/api-client';
import type { AuthConfig } from '@/lib/types';
import { t } from '@/lib/i18n';

export default function LandingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [allowPrivateNetworks, setAllowPrivateNetworks] = useState(false);

  // REQ-AUTH-002 / SCENARIO-AUTH-PROTECTED-001: when discovery returns 401,
  // surface an inline auth form so the user can retry with credentials
  // without having to reach the configure page (unreachable before discovery).
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [auth, setAuth] = useState<AuthConfig>({ type: 'bearer' });

  useEffect(() => {
    // REQ-SSRF-002: if the server has opted into private-network mode, relax
    // the client-side URL validation so users can enter localhost URLs.
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body && typeof body.allowPrivateNetworks === 'boolean') {
          setAllowPrivateNetworks(body.allowPrivateNetworks);
        }
      })
      .catch(() => {
        /* swallow — health probe is best-effort */
      });
  }, []);

  async function discoverWith(url: string, authConfig?: AuthConfig) {
    setIsLoading(true);
    setServerError(null);

    try {
      const result = await apiClient.createAssessment({
        endpointUrl: url,
        auth: authConfig && authConfig.type !== 'none' ? authConfig : undefined,
      });

      // Store discovery result AND the auth we succeeded with — so the
      // configure page inherits the credentials for the test-run phase.
      sessionStorage.setItem(
        `discovery:${result.id}`,
        JSON.stringify(result.discoveryResult),
      );
      if (authConfig && authConfig.type !== 'none') {
        sessionStorage.setItem(
          `auth:${result.id}`,
          JSON.stringify(authConfig),
        );
      }

      router.push(`/assess/configure?session=${result.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 401 || err.statusCode === 403) {
          setAuthRequired(true);
          setPendingUrl(url);
          setServerError(
            authConfig && authConfig.type !== 'none'
              ? t('landing.error.authRejected')
              : t('landing.error.authRequired'),
          );
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError(t('landing.error.unreachable'));
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDiscover(url: string) {
    setAuthRequired(false);
    setPendingUrl(url);
    await discoverWith(url);
  }

  async function handleRetryWithAuth() {
    if (!pendingUrl) return;
    await discoverWith(pendingUrl, auth);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      {allowPrivateNetworks && (
        <div
          className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
          aria-live="polite"
        >
          <strong className="font-semibold">Local-dev mode.</strong>{' '}
          The server is running with <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">ALLOW_PRIVATE_NETWORKS=true</code>, so this instance accepts assessments against <code>localhost</code> and RFC 1918 (10/8, 172.16/12, 192.168/16) addresses. Do not run this mode in production.
        </div>
      )}
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {t('landing.heading')}
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          {t('landing.subheading')}
        </p>
      </div>

      {/* Feature List */}
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FeatureItem
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
          text={t('landing.feature.discover')}
        />
        <FeatureItem
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          text={t('landing.feature.tests')}
        />
        <FeatureItem
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          text={t('landing.feature.export')}
        />
      </div>

      {/* URL Input Section */}
      <div className="mt-12">
        <URLInputForm
          onSubmit={handleDiscover}
          isLoading={isLoading}
          serverError={authRequired ? null : serverError}
          allowPrivateNetworks={allowPrivateNetworks}
        />
      </div>

      {/* Auth-required inline panel — appears only after discovery returned 401/403 */}
      {authRequired && pendingUrl && (
        <div
          className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4"
          role="region"
          aria-labelledby="auth-required-heading"
        >
          <h2 id="auth-required-heading" className="text-base font-semibold text-amber-900">
            {t('landing.authPanel.heading')}
          </h2>
          <p className="mt-1 text-sm text-amber-800">
            {serverError || t('landing.error.authRequired')}
          </p>
          <p className="mt-2 text-xs text-amber-700">
            <span className="font-mono">{pendingUrl}</span>
          </p>

          <div className="mt-4 rounded-md border border-amber-200 bg-white p-4">
            <AuthConfigForm auth={auth} onChange={setAuth} />
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleRetryWithAuth}
              disabled={isLoading || auth.type === 'none'}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? t('landing.authPanel.retrying') : t('landing.authPanel.retry')}
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthRequired(false);
                setPendingUrl(null);
                setServerError(null);
                setAuth({ type: 'bearer' });
              }}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('landing.authPanel.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 text-center">
      <div className="text-gray-600">{icon}</div>
      <p className="text-sm font-medium text-gray-700">{text}</p>
    </div>
  );
}
