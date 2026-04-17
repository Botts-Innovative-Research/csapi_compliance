'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { t } from '@/lib/i18n';

interface URLInputFormProps {
  onSubmit: (url: string) => Promise<void>;
  isLoading?: boolean;
  serverError?: string | null;
  /** When true, client-side validation accepts localhost and RFC 1918 ranges.
   *  Mirrors the server's ALLOW_PRIVATE_NETWORKS setting (REQ-SSRF-002). */
  allowPrivateNetworks?: boolean;
}

/** Client-side URL validation: must be http:// or https://. Private/reserved
 *  IPs rejected unless allowPrivateNetworks is true (server opt-in). */
function validateUrl(value: string, allowPrivateNetworks = false): string | null {
  if (!value.trim()) {
    return null; // Don't nag on empty
  }
  if (value.length > 2048) {
    return t('urlForm.validation.tooLong');
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return t('urlForm.validation.invalidUrl');
    }
    if (allowPrivateNetworks) {
      return null;
    }
    // Check for private/reserved IPs
    const hostname = url.hostname;
    if (
      hostname === 'localhost' ||
      hostname === '::1' ||
      /^127\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^0\./.test(hostname) ||
      /^169\.254\./.test(hostname)
    ) {
      return t('urlForm.validation.privateIp');
    }
    return null;
  } catch {
    return t('urlForm.validation.invalidUrl');
  }
}

export default function URLInputForm({
  onSubmit,
  isLoading = false,
  serverError = null,
  allowPrivateNetworks = false,
}: URLInputFormProps) {
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const displayError = serverError || (touched ? validationError : null);
  const isValid = url.trim().length > 0 && validateUrl(url, allowPrivateNetworks) === null;

  function handleBlur() {
    setTouched(true);
    if (url.trim()) {
      setValidationError(validateUrl(url, allowPrivateNetworks));
    }
  }

  function handleChange(value: string) {
    setUrl(value);
    if (touched) {
      setValidationError(validateUrl(value, allowPrivateNetworks));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    const error = validateUrl(url, allowPrivateNetworks);
    if (error) {
      setValidationError(error);
      return;
    }
    await onSubmit(url);
  }

  function fillDemoUrl() {
    const demoUrl = 'https://api.georobotix.io/ogc/t18/api';
    setUrl(demoUrl);
    setValidationError(null);
    setTouched(false);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <label
        htmlFor="endpoint-url"
        className="block text-sm font-medium text-gray-700"
      >
        {t('urlForm.label')}
      </label>
      <div className="mt-1">
        <input
          ref={inputRef}
          id="endpoint-url"
          type="url"
          value={url}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          readOnly={isLoading}
          placeholder={t('urlForm.placeholder')}
          maxLength={2048}
          className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
            displayError
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
          } ${isLoading ? 'cursor-not-allowed bg-gray-50' : 'bg-white'}`}
          aria-invalid={!!displayError}
          aria-describedby={displayError ? 'url-error' : undefined}
        />
      </div>

      {displayError && (
        <p id="url-error" className="mt-1.5 flex items-center text-sm text-red-600" role="alert">
          <svg
            className="mr-1 h-4 w-4 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          {displayError}
        </p>
      )}

      <button
        type="submit"
        disabled={!isValid || isLoading}
        className="mt-3 w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
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
            {t('urlForm.discovering')}
          </span>
        ) : (
          t('urlForm.discover')
        )}
      </button>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">{t('urlForm.demoPrompt')}</p>
        <button
          type="button"
          onClick={fillDemoUrl}
          className="mt-1 text-sm font-medium text-blue-600 underline hover:text-blue-800"
        >
          https://api.georobotix.io/ogc/t18/api
        </button>
      </div>
    </form>
  );
}
