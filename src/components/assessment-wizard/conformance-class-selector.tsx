'use client';

import { useMemo, type ChangeEvent } from 'react';
import type { DeclaredConformanceClass } from '@/engine/conformance-mapper.js';
import { t } from '@/lib/i18n';

interface ConformanceClassSelectorProps {
  classes: DeclaredConformanceClass[];
  selectedUris: string[];
  onSelectionChange: (uris: string[]) => void;
  /** Whether the user has confirmed they accept destructive tests. */
  destructiveConfirmed: boolean;
  onDestructiveConfirmChange: (confirmed: boolean) => void;
}

/** Display names for standard parts. Accessed as a function to resolve t() at call time. */
function getStandardPartLabel(part: string): string {
  const labels: Record<string, string> = {
    'ogcapi-common': t('selector.group.parentStandards'),
    'ogcapi-features': t('selector.group.parentStandards'),
    'cs-part1': t('selector.group.csPart1'),
    'cs-part2': t('selector.group.csPart2'),
    unknown: t('selector.group.other'),
  };
  return labels[part] || part;
}

/** Order for group sorting. */
const STANDARD_PART_ORDER: Record<string, number> = {
  'ogcapi-common': 0,
  'ogcapi-features': 0,
  'cs-part1': 1,
  'cs-part2': 2,
  unknown: 3,
};

/** Check if a class URI represents a write/mutating operation. */
function isMutatingClass(uri: string): boolean {
  return (
    uri.includes('/conf/create-replace-delete') || uri.includes('/conf/update')
  );
}

/** Group classes by display label, merging common+features into "Parent Standards". */
function groupClasses(classes: DeclaredConformanceClass[]) {
  const groups = new Map<
    string,
    { label: string; order: number; items: DeclaredConformanceClass[]; isMutating: boolean }
  >();

  for (const cls of classes) {
    const mutating = isMutatingClass(cls.uri);
    let groupKey: string;
    let label: string;

    if (mutating) {
      groupKey = 'mutating';
      label = t('selector.group.mutating');
    } else if (!cls.supported) {
      groupKey = 'unsupported';
      label = t('selector.group.unsupported');
    } else {
      groupKey = getStandardPartLabel(cls.standardPart);
      label = groupKey;
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        label,
        order: mutating ? 10 : !cls.supported ? 20 : (STANDARD_PART_ORDER[cls.standardPart] ?? 5),
        items: [],
        isMutating: mutating,
      });
    }
    groups.get(groupKey)!.items.push(cls);
  }

  return [...groups.values()].sort((a, b) => a.order - b.order);
}

export default function ConformanceClassSelector({
  classes,
  selectedUris,
  onSelectionChange,
  destructiveConfirmed,
  onDestructiveConfirmChange,
}: ConformanceClassSelectorProps) {
  const groups = useMemo(() => groupClasses(classes), [classes]);

  const supportedClasses = useMemo(
    () => classes.filter((c) => c.supported),
    [classes],
  );
  const allSupported = useMemo(
    () => supportedClasses.map((c) => c.uri),
    [supportedClasses],
  );

  const anyMutatingSelected = useMemo(
    () => selectedUris.some(isMutatingClass),
    [selectedUris],
  );

  const allSelected =
    allSupported.length > 0 &&
    allSupported.every((uri) => selectedUris.includes(uri));

  function handleSelectAll() {
    if (allSelected) {
      onSelectionChange([]);
      onDestructiveConfirmChange(false);
    } else {
      onSelectionChange([...allSupported]);
    }
  }

  function handleToggle(uri: string, checked: boolean) {
    if (checked) {
      onSelectionChange([...selectedUris, uri]);
    } else {
      const next = selectedUris.filter((u) => u !== uri);
      onSelectionChange(next);
      // If no mutating classes remain selected, unset confirmation
      if (!next.some(isMutatingClass)) {
        onDestructiveConfirmChange(false);
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          {t('selector.heading')}
        </h3>
        <button
          type="button"
          onClick={handleSelectAll}
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          {allSelected ? t('selector.deselectAll') : t('selector.selectAll')}
        </button>
      </div>

      {groups.map((group) => (
        <div
          key={group.label}
          className={`rounded-lg border p-4 ${
            group.isMutating ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200'
          }`}
        >
          <h4
            className={`mb-3 text-sm font-semibold ${
              group.isMutating ? 'text-amber-800' : 'text-gray-700'
            }`}
          >
            {group.label}
          </h4>

          <div className="space-y-2">
            {group.items.map((cls) => {
              const isSelected = selectedUris.includes(cls.uri);
              const isMutating = isMutatingClass(cls.uri);
              const isUnsupported = !cls.supported;

              return (
                <div key={cls.uri}>
                  <label
                    className={`flex items-start gap-3 rounded-md px-2 py-1.5 ${
                      isUnsupported
                        ? 'cursor-not-allowed opacity-50'
                        : 'cursor-pointer hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isUnsupported}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        handleToggle(cls.uri, e.target.checked)
                      }
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {cls.name}
                        </span>
                        {isUnsupported && (
                          <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                            {t('selector.badge.unsupported')}
                          </span>
                        )}
                      </div>
                      <span className="block truncate text-xs font-mono text-gray-400">
                        {cls.uri}
                      </span>
                    </div>
                  </label>

                  {/* Destructive warning for mutating classes */}
                  {isMutating && isSelected && (
                    <div className="ml-9 mt-1 rounded-md border border-amber-300 bg-amber-50 p-3">
                      <div className="flex gap-2">
                        <svg
                          className="h-5 w-5 flex-shrink-0 text-amber-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                        <p className="text-sm text-amber-800">
                          {t('selector.mutatingWarning')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Destructive confirmation toggle */}
      {anyMutatingSelected && (
        <div className="rounded-lg border border-amber-400 bg-amber-50 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={destructiveConfirmed}
              onChange={(e) => onDestructiveConfirmChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm font-medium text-amber-900">
              {t('selector.destructiveConfirm')}
            </span>
          </label>
        </div>
      )}

      {supportedClasses.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-600">
            {t('selector.emptyState')}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {t('selector.emptyStateHint')}
          </p>
        </div>
      )}
    </div>
  );
}
