'use client';

import type { RunConfig } from '@/lib/types.js';
import { ENGINE_DEFAULTS } from '@/lib/constants.js';

interface RunConfigFormProps {
  config: RunConfig;
  onChange: (config: RunConfig) => void;
}

export default function RunConfigForm({ config, onChange }: RunConfigFormProps) {
  const timeoutSeconds = Math.round(config.timeoutMs / 1000);

  function handleTimeoutChange(seconds: number) {
    const clamped = Math.min(
      ENGINE_DEFAULTS.maxTimeoutMs / 1000,
      Math.max(ENGINE_DEFAULTS.minTimeoutMs / 1000, seconds),
    );
    onChange({ ...config, timeoutMs: clamped * 1000 });
  }

  function handleConcurrencyChange(value: number) {
    const clamped = Math.min(ENGINE_DEFAULTS.maxConcurrency, Math.max(1, value));
    onChange({ ...config, concurrency: clamped });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900">
        Advanced Settings
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Timeout */}
        <div>
          <label
            htmlFor="timeout"
            className="block text-sm font-medium text-gray-700"
          >
            Request timeout (seconds)
          </label>
          <input
            id="timeout"
            type="number"
            min={ENGINE_DEFAULTS.minTimeoutMs / 1000}
            max={ENGINE_DEFAULTS.maxTimeoutMs / 1000}
            value={timeoutSeconds}
            onChange={(e) => handleTimeoutChange(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <p className="mt-1 text-xs text-gray-400">
            {ENGINE_DEFAULTS.minTimeoutMs / 1000}&#8211;{ENGINE_DEFAULTS.maxTimeoutMs / 1000} seconds
          </p>
        </div>

        {/* Concurrency */}
        <div>
          <label
            htmlFor="concurrency"
            className="block text-sm font-medium text-gray-700"
          >
            Max concurrent requests
          </label>
          <input
            id="concurrency"
            type="number"
            min={1}
            max={ENGINE_DEFAULTS.maxConcurrency}
            value={config.concurrency}
            onChange={(e) => handleConcurrencyChange(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <p className="mt-1 text-xs text-gray-400">
            1&#8211;{ENGINE_DEFAULTS.maxConcurrency}
          </p>
        </div>
      </div>
    </div>
  );
}
