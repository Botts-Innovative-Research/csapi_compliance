'use client';

import { useState } from 'react';
import type { HttpExchange } from '@/lib/types';

interface HttpExchangeViewerProps {
  exchange: HttpExchange;
  /** Default to Request tab for passed tests, Response tab for failed tests. */
  defaultTab?: 'request' | 'response';
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-blue-700 bg-blue-100',
  POST: 'text-green-700 bg-green-100',
  PUT: 'text-amber-700 bg-amber-100',
  PATCH: 'text-purple-700 bg-purple-100',
  DELETE: 'text-red-700 bg-red-100',
};

function getStatusCodeColor(code: number): string {
  if (code >= 200 && code < 300) return 'text-green-600 bg-green-50';
  if (code >= 300 && code < 400) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

function getResponseTimeColor(ms: number): string {
  if (ms < 500) return 'text-green-600';
  if (ms <= 2000) return 'text-amber-600';
  return 'text-red-600';
}

function formatJsonBody(body: string): string {
  try {
    const parsed = JSON.parse(body);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return body;
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    // Fallback: do nothing if clipboard not available
  });
}

export default function HttpExchangeViewer({
  exchange,
  defaultTab = 'request',
}: HttpExchangeViewerProps) {
  const [activeTab, setActiveTab] = useState<'request' | 'response'>(defaultTab);
  const [requestHeadersOpen, setRequestHeadersOpen] = useState(true);
  const [requestBodyOpen, setRequestBodyOpen] = useState(false);
  const [responseHeadersOpen, setResponseHeadersOpen] = useState(false);
  const [responseBodyOpen, setResponseBodyOpen] = useState(true);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  function handleCopy(text: string, label: string) {
    copyToClipboard(text);
    setCopyFeedback(`${label} copied`);
    setTimeout(() => setCopyFeedback(null), 2000);
  }

  const { request, response } = exchange;
  const methodColor = METHOD_COLORS[request.method.toUpperCase()] || 'text-gray-700 bg-gray-100';
  const statusColor = getStatusCodeColor(response.statusCode);
  const responseTimeColor = getResponseTimeColor(response.responseTimeMs);

  return (
    <div className="flex flex-col">
      {/* Tab Bar */}
      <div className="flex border-b border-gray-200" role="tablist">
        <button
          role="tab"
          id={`tab-request-${exchange.id}`}
          aria-selected={activeTab === 'request'}
          aria-controls={`tabpanel-request-${exchange.id}`}
          tabIndex={activeTab === 'request' ? 0 : -1}
          onClick={() => setActiveTab('request')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'request'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Request
        </button>
        <button
          role="tab"
          id={`tab-response-${exchange.id}`}
          aria-selected={activeTab === 'response'}
          aria-controls={`tabpanel-response-${exchange.id}`}
          tabIndex={activeTab === 'response' ? 0 : -1}
          onClick={() => setActiveTab('response')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'response'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Response
        </button>
      </div>

      {/* Copy Feedback Toast */}
      {copyFeedback && (
        <div className="fixed bottom-4 right-4 z-50 rounded-md bg-gray-900 px-3 py-2 text-sm text-white shadow-lg" role="status" aria-live="polite">
          {copyFeedback}
        </div>
      )}

      {/* Request Tab */}
      {activeTab === 'request' && (
        <div className="space-y-3 py-3" role="tabpanel" id={`tabpanel-request-${exchange.id}`} aria-labelledby={`tab-request-${exchange.id}`}>
          {/* Method + URL */}
          <div className="flex items-start gap-2">
            <span
              className={`inline-flex shrink-0 items-center rounded px-2 py-0.5 text-xs font-bold font-mono ${methodColor}`}
            >
              {request.method.toUpperCase()}
            </span>
            <code className="break-all text-sm text-gray-800">{request.url}</code>
          </div>

          {/* Headers */}
          <CollapsibleSection
            title="Headers"
            count={Object.keys(request.headers).length}
            isOpen={requestHeadersOpen}
            onToggle={() => setRequestHeadersOpen(!requestHeadersOpen)}
          >
            <HeadersTable headers={request.headers} />
          </CollapsibleSection>

          {/* Body */}
          <CollapsibleSection
            title="Body"
            isOpen={requestBodyOpen}
            onToggle={() => setRequestBodyOpen(!requestBodyOpen)}
          >
            {request.body ? (
              <div className="relative">
                <button
                  onClick={() => handleCopy(request.body!, 'Request body')}
                  aria-label="Copy request body"
                  className="absolute right-2 top-2 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                >
                  Copy
                </button>
                <pre className="max-h-[400px] overflow-auto rounded-md bg-gray-50 p-3 text-xs font-mono text-gray-800">
                  {formatJsonBody(request.body)}
                </pre>
              </div>
            ) : (
              <p className="text-sm italic text-gray-400">No request body</p>
            )}
          </CollapsibleSection>
        </div>
      )}

      {/* Response Tab */}
      {activeTab === 'response' && (
        <div className="space-y-3 py-3" role="tabpanel" id={`tabpanel-response-${exchange.id}`} aria-labelledby={`tab-response-${exchange.id}`}>
          {/* Status Code + Response Time */}
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold font-mono ${statusColor}`}
            >
              {response.statusCode}
            </span>
            <span className={`text-xs font-medium ${responseTimeColor}`}>
              {response.responseTimeMs}ms
            </span>
          </div>

          {/* Headers */}
          <CollapsibleSection
            title="Headers"
            count={Object.keys(response.headers).length}
            isOpen={responseHeadersOpen}
            onToggle={() => setResponseHeadersOpen(!responseHeadersOpen)}
          >
            <HeadersTable headers={response.headers} />
          </CollapsibleSection>

          {/* Body */}
          <CollapsibleSection
            title="Body"
            isOpen={responseBodyOpen}
            onToggle={() => setResponseBodyOpen(!responseBodyOpen)}
          >
            {response.body ? (
              <div className="relative">
                <button
                  onClick={() => handleCopy(response.body, 'Response body')}
                  aria-label="Copy response body"
                  className="absolute right-2 top-2 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                >
                  Copy
                </button>
                <pre className="max-h-[400px] overflow-auto rounded-md bg-gray-50 p-3 text-xs font-mono text-gray-800">
                  {formatJsonBody(response.body)}
                </pre>
              </div>
            ) : (
              <p className="text-sm italic text-gray-400">No response body</p>
            )}
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}

/** Collapsible section with a toggle header. */
function CollapsibleSection({
  title,
  count,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  count?: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-md">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span>
          {title}
          {count !== undefined && (
            <span className="ml-1 text-xs text-gray-400">({count})</span>
          )}
        </span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="border-t border-gray-200 px-3 py-2">{children}</div>}
    </div>
  );
}

/** Key-value table for HTTP headers. */
function HeadersTable({ headers }: { headers: Record<string, string> }) {
  const entries = Object.entries(headers);

  if (entries.length === 0) {
    return <p className="text-sm italic text-gray-400">No headers</p>;
  }

  return (
    <div className="space-y-1">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-2 text-xs font-mono">
          <span className="shrink-0 font-bold text-gray-700">{key}:</span>
          <span className="break-all text-gray-600">{value}</span>
        </div>
      ))}
    </div>
  );
}
