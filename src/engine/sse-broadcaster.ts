// REQ-SESS-001: SSE progress event streaming
// REQ-SESS-002: Event replay via Last-Event-ID
// REQ-SESS-003: Multi-client broadcast per assessment

import type { Response } from 'express';
import type { ProgressEvent } from '@/lib/types.js';
import { SESSION_DEFAULTS } from '@/lib/constants.js';

export interface SSEClient {
  id: string;
  res: Response;
  assessmentId: string;
}

interface StoredEvent {
  eventId: string;
  event: ProgressEvent;
}

/**
 * Broadcasts progress events to connected SSE clients.
 *
 * - Formats events in the SSE wire format (id/event/data fields).
 * - Maintains per-assessment event history for replay on reconnect.
 * - Supports multiple concurrent clients per assessment.
 */
export class SSEBroadcaster {
  private clients: Map<string, SSEClient> = new Map();
  private eventHistory: Map<string, StoredEvent[]> = new Map();
  private eventCounter = 0;

  /**
   * Add a new SSE client connection.
   * If lastEventId is provided, replays any missed events.
   */
  addClient(client: SSEClient, lastEventId?: string): void {
    this.clients.set(client.id, client);

    // Replay missed events if the client provides a Last-Event-ID
    if (lastEventId) {
      const history = this.eventHistory.get(client.assessmentId);
      if (history) {
        const lastIdx = history.findIndex((e) => e.eventId === lastEventId);
        // Replay everything after the last seen event
        const startIdx = lastIdx === -1 ? 0 : lastIdx + 1;
        for (let i = startIdx; i < history.length; i++) {
          const stored = history[i];
          this.sendToClient(client, stored.eventId, stored.event);
        }
      }
    }
  }

  /**
   * Remove a client (e.g. on disconnect).
   */
  removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * Broadcast a progress event to all clients watching a given assessment.
   */
  broadcast(assessmentId: string, event: ProgressEvent): void {
    this.eventCounter++;
    const eventId = String(this.eventCounter);

    // Store in history
    this.storeEvent(assessmentId, eventId, event);

    // Send to all connected clients for this assessment
    for (const client of this.clients.values()) {
      if (client.assessmentId === assessmentId) {
        this.sendToClient(client, eventId, event);
      }
    }
  }

  /**
   * Get the number of connected clients for a given assessment.
   */
  getClientCount(assessmentId: string): number {
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.assessmentId === assessmentId) {
        count++;
      }
    }
    return count;
  }

  /**
   * Clean up event history for a completed assessment.
   */
  clearHistory(assessmentId: string): void {
    this.eventHistory.delete(assessmentId);
  }

  // --- Private helpers ---

  /**
   * Write an SSE-formatted event to a single client.
   * Format: `id: {eventId}\nevent: {type}\ndata: {json}\n\n`
   */
  private sendToClient(
    client: SSEClient,
    eventId: string,
    event: ProgressEvent,
  ): void {
    const data = JSON.stringify(event);
    const message = `id: ${eventId}\nevent: ${event.type}\ndata: ${data}\n\n`;
    client.res.write(message);
  }

  /**
   * Store an event in the per-assessment history, enforcing the max replay limit.
   */
  private storeEvent(
    assessmentId: string,
    eventId: string,
    event: ProgressEvent,
  ): void {
    let history = this.eventHistory.get(assessmentId);
    if (!history) {
      history = [];
      this.eventHistory.set(assessmentId, history);
    }

    history.push({ eventId, event });

    // Trim to max replay events
    if (history.length > SESSION_DEFAULTS.maxReplayEvents) {
      const excess = history.length - SESSION_DEFAULTS.maxReplayEvents;
      history.splice(0, excess);
    }
  }
}
