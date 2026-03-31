'use client';

import { type ChangeEvent } from 'react';
import type { AuthConfig, AuthType } from '@/lib/types.js';
import { t } from '@/lib/i18n';

interface AuthConfigFormProps {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}

function getAuthTypes(): { value: AuthType; label: string }[] {
  return [
    { value: 'none', label: t('auth.type.none') },
    { value: 'bearer', label: t('auth.type.bearer') },
    { value: 'apikey', label: t('auth.type.apikey') },
    { value: 'basic', label: t('auth.type.basic') },
  ];
}

export default function AuthConfigForm({ auth, onChange }: AuthConfigFormProps) {
  function handleTypeChange(type: AuthType) {
    onChange({
      type,
      token: type === 'bearer' ? auth.token : undefined,
      headerName: type === 'apikey' ? (auth.headerName || 'X-API-Key') : undefined,
      headerValue: type === 'apikey' ? auth.headerValue : undefined,
      username: type === 'basic' ? auth.username : undefined,
      password: type === 'basic' ? auth.password : undefined,
    });
  }

  function handleFieldChange(
    field: keyof AuthConfig,
    value: string,
  ) {
    onChange({ ...auth, [field]: value });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900">
        {t('auth.heading')}
      </h3>

      {/* Auth type radio group */}
      <div className="flex flex-wrap gap-4">
        {getAuthTypes().map(({ value, label }) => (
          <label
            key={value}
            className="flex items-center gap-2 cursor-pointer"
          >
            <input
              type="radio"
              name="auth-type"
              value={value}
              checked={auth.type === value}
              onChange={() => handleTypeChange(value)}
              className="h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            <span className="text-sm text-gray-700">{label}</span>
          </label>
        ))}
      </div>

      {/* Conditional fields */}
      {auth.type === 'bearer' && (
        <div>
          <label
            htmlFor="bearer-token"
            className="block text-sm font-medium text-gray-700"
          >
            {t('auth.field.token')} <span className="text-red-500">*</span>
          </label>
          <input
            id="bearer-token"
            type="password"
            value={auth.token || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleFieldChange('token', e.target.value)
            }
            placeholder={t('auth.placeholder.token')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            required
          />
        </div>
      )}

      {auth.type === 'apikey' && (
        <div className="space-y-3">
          <div>
            <label
              htmlFor="api-key-header"
              className="block text-sm font-medium text-gray-700"
            >
              {t('auth.field.headerName')} <span className="text-red-500">*</span>
            </label>
            <input
              id="api-key-header"
              type="text"
              value={auth.headerName || 'X-API-Key'}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleFieldChange('headerName', e.target.value)
              }
              placeholder={t('auth.placeholder.headerName')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              required
            />
          </div>
          <div>
            <label
              htmlFor="api-key-value"
              className="block text-sm font-medium text-gray-700"
            >
              {t('auth.field.headerValue')} <span className="text-red-500">*</span>
            </label>
            <input
              id="api-key-value"
              type="password"
              value={auth.headerValue || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleFieldChange('headerValue', e.target.value)
              }
              placeholder={t('auth.placeholder.headerValue')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              required
            />
          </div>
        </div>
      )}

      {auth.type === 'basic' && (
        <div className="space-y-3">
          <div>
            <label
              htmlFor="basic-username"
              className="block text-sm font-medium text-gray-700"
            >
              {t('auth.field.username')} <span className="text-red-500">*</span>
            </label>
            <input
              id="basic-username"
              type="text"
              value={auth.username || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleFieldChange('username', e.target.value)
              }
              placeholder={t('auth.placeholder.username')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              required
            />
          </div>
          <div>
            <label
              htmlFor="basic-password"
              className="block text-sm font-medium text-gray-700"
            >
              {t('auth.field.password')} <span className="text-red-500">*</span>
            </label>
            <input
              id="basic-password"
              type="password"
              value={auth.password || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleFieldChange('password', e.target.value)
              }
              placeholder={t('auth.placeholder.password')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              required
            />
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">
        {t('auth.credentialsNote')}
      </p>
    </div>
  );
}
