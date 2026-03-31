'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import URLInputForm from '@/components/assessment-wizard/url-input-form';
import apiClient, { ApiError } from '@/services/api-client';
import { t } from '@/lib/i18n';

export default function LandingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleDiscover(url: string) {
    setIsLoading(true);
    setServerError(null);

    try {
      const result = await apiClient.createAssessment({ endpointUrl: url });

      // Store discovery result for the configure page
      sessionStorage.setItem(
        `discovery:${result.id}`,
        JSON.stringify(result.discoveryResult),
      );

      // Redirect to configure page with session ID
      router.push(`/assess/configure?session=${result.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 401 || err.statusCode === 403) {
          setServerError(t('landing.error.authRequired'));
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
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
          serverError={serverError}
        />
      </div>
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
