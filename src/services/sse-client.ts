import type { ProgressEventData } from '@/lib/types';

export interface SSEHandlers {
  onTestCompleted: (data: ProgressEventData) => void;
  onClassCompleted: (data: ProgressEventData) => void;
  onAssessmentCompleted: (data: ProgressEventData) => void;
  onTestStarted?: (data: ProgressEventData) => void;
  onClassStarted?: (data: ProgressEventData) => void;
  onAssessmentStarted?: (data: ProgressEventData) => void;
  onError: (error: Event) => void;
  onReconnecting?: () => void;
  onReconnected?: () => void;
  onReconnectFailed?: () => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL_MS = 3000;

const EVENT_HANDLER_MAP: Record<string, keyof SSEHandlers> = {
  'test-completed': 'onTestCompleted',
  'class-completed': 'onClassCompleted',
  'assessment-completed': 'onAssessmentCompleted',
  'test-started': 'onTestStarted',
  'class-started': 'onClassStarted',
  'assessment-started': 'onAssessmentStarted',
};

/**
 * Creates an SSE client that connects to the assessment events endpoint
 * and dispatches events to the provided handlers.
 *
 * Returns an object with a close() method to terminate the connection.
 */
export function createSSEClient(
  assessmentId: string,
  handlers: SSEHandlers,
): { close: () => void } {
  let eventSource: EventSource | null = null;
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  function connect() {
    if (closed) return;

    eventSource = new EventSource(`/api/assessments/${assessmentId}/events`);

    eventSource.onopen = () => {
      if (reconnectAttempts > 0) {
        handlers.onReconnected?.();
      }
      reconnectAttempts = 0;
    };

    // Listen for each event type
    for (const [eventType, handlerKey] of Object.entries(EVENT_HANDLER_MAP)) {
      eventSource.addEventListener(eventType, (event: MessageEvent) => {
        try {
          const data: ProgressEventData = JSON.parse(event.data);
          const handler = handlers[handlerKey] as
            | ((data: ProgressEventData) => void)
            | undefined;
          handler?.(data);
        } catch {
          // Ignore malformed events
        }
      });
    }

    eventSource.onerror = (error: Event) => {
      if (closed) return;

      eventSource?.close();
      eventSource = null;

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        handlers.onReconnecting?.();
        reconnectTimer = setTimeout(connect, RECONNECT_INTERVAL_MS);
      } else {
        handlers.onReconnectFailed?.();
        handlers.onError(error);
      }
    };
  }

  connect();

  return {
    close() {
      closed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    },
  };
}
