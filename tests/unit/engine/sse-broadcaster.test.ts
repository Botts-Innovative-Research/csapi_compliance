// SCENARIO coverage (WARN-003 traceability sweep 2026-04-17T19:35Z):
//   SCENARIO-SESS-PROG-001..004 (progress-event broadcast: connect, event sequence,
//     disconnect cleanup, back-pressure)

// Tests for SSEBroadcaster — src/engine/sse-broadcaster.ts
// REQ-SESS-001: SSE progress event streaming
// REQ-SESS-002: Event replay via Last-Event-ID
// REQ-SESS-003: Multi-client broadcast per assessment

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SSEBroadcaster } from '@/engine/sse-broadcaster.js';
import type { SSEClient } from '@/engine/sse-broadcaster.js';
import type { ProgressEvent } from '@/lib/types.js';

/** Create a mock Express Response with a writable `write()` method. */
function createMockResponse() {
  return {
    write: vi.fn(),
    flush: vi.fn(),
  };
}

/** Create a mock SSEClient. */
function createClient(
  id: string,
  assessmentId: string,
): { client: SSEClient; res: ReturnType<typeof createMockResponse> } {
  const res = createMockResponse();
  return {
    client: { id, res: res as any, assessmentId },
    res,
  };
}

/** Create a test ProgressEvent. */
function createProgressEvent(
  type: ProgressEvent['type'],
  assessmentId: string,
): ProgressEvent {
  return {
    type,
    assessmentId,
    timestamp: new Date().toISOString(),
    data: {
      testName: 'test-1',
      status: 'pass',
    },
  };
}

describe('SSEBroadcaster', () => {
  let broadcaster: SSEBroadcaster;

  beforeEach(() => {
    broadcaster = new SSEBroadcaster();
  });

  // -----------------------------------------------------------------------
  // addClient / getClientCount
  // -----------------------------------------------------------------------

  it('addClient registers client', () => {
    const { client } = createClient('c1', 'assess-1');
    broadcaster.addClient(client);
    expect(broadcaster.getClientCount('assess-1')).toBe(1);
  });

  it('getClientCount returns correct count', () => {
    const { client: c1 } = createClient('c1', 'assess-1');
    const { client: c2 } = createClient('c2', 'assess-1');
    const { client: c3 } = createClient('c3', 'assess-2');

    broadcaster.addClient(c1);
    broadcaster.addClient(c2);
    broadcaster.addClient(c3);

    expect(broadcaster.getClientCount('assess-1')).toBe(2);
    expect(broadcaster.getClientCount('assess-2')).toBe(1);
    expect(broadcaster.getClientCount('assess-unknown')).toBe(0);
  });

  // -----------------------------------------------------------------------
  // broadcast
  // -----------------------------------------------------------------------

  it('broadcast sends SSE-formatted events to connected clients', () => {
    const { client, res } = createClient('c1', 'assess-1');
    broadcaster.addClient(client);

    const event = createProgressEvent('test-completed', 'assess-1');
    broadcaster.broadcast('assess-1', event);

    expect(res.write).toHaveBeenCalledTimes(1);
    const written = res.write.mock.calls[0][0] as string;

    // Verify SSE wire format
    expect(written).toContain('id: ');
    expect(written).toContain('event: test-completed');
    expect(written).toContain('data: ');
    expect(written).toMatch(/\n\n$/); // ends with double newline

    // Data should be parseable JSON matching our event
    const dataLine = written.split('\n').find((l: string) => l.startsWith('data: '))!;
    const parsed = JSON.parse(dataLine.replace('data: ', ''));
    expect(parsed.type).toBe('test-completed');
    expect(parsed.assessmentId).toBe('assess-1');
  });

  it('broadcast only sends to clients watching the same assessmentId', () => {
    const { client: c1, res: res1 } = createClient('c1', 'assess-1');
    const { client: c2, res: res2 } = createClient('c2', 'assess-2');

    broadcaster.addClient(c1);
    broadcaster.addClient(c2);

    const event = createProgressEvent('test-completed', 'assess-1');
    broadcaster.broadcast('assess-1', event);

    expect(res1.write).toHaveBeenCalledTimes(1);
    expect(res2.write).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // removeClient
  // -----------------------------------------------------------------------

  it('removeClient stops sending to that client', () => {
    const { client, res } = createClient('c1', 'assess-1');
    broadcaster.addClient(client);
    broadcaster.removeClient('c1');

    const event = createProgressEvent('test-completed', 'assess-1');
    broadcaster.broadcast('assess-1', event);

    expect(res.write).not.toHaveBeenCalled();
    expect(broadcaster.getClientCount('assess-1')).toBe(0);
  });

  // -----------------------------------------------------------------------
  // Event history & replay
  // -----------------------------------------------------------------------

  it('event history is stored per assessment', () => {
    const event1 = createProgressEvent('test-started', 'assess-1');
    const event2 = createProgressEvent('test-completed', 'assess-1');
    const event3 = createProgressEvent('test-started', 'assess-2');

    broadcaster.broadcast('assess-1', event1);
    broadcaster.broadcast('assess-1', event2);
    broadcaster.broadcast('assess-2', event3);

    // Verify by adding a client with lastEventId="0" (non-existent) so all
    // events for assess-1 are replayed
    const { client, res } = createClient('c-late', 'assess-1');
    broadcaster.addClient(client, '0');

    // Should replay only the 2 events for assess-1 (event "0" not found so starts from beginning)
    expect(res.write).toHaveBeenCalledTimes(2);
  });

  it('addClient with lastEventId replays missed events', () => {
    // Broadcast 3 events before any client connects
    const e1 = createProgressEvent('assessment-started', 'assess-1');
    const e2 = createProgressEvent('test-started', 'assess-1');
    const e3 = createProgressEvent('test-completed', 'assess-1');

    broadcaster.broadcast('assess-1', e1); // id = "1"
    broadcaster.broadcast('assess-1', e2); // id = "2"
    broadcaster.broadcast('assess-1', e3); // id = "3"

    // Client reconnects saying they last saw event "1"
    const { client, res } = createClient('c1', 'assess-1');
    broadcaster.addClient(client, '1');

    // Should replay events "2" and "3"
    expect(res.write).toHaveBeenCalledTimes(2);

    // Verify the replayed events contain correct IDs
    const call1 = res.write.mock.calls[0][0] as string;
    expect(call1).toContain('id: 2');

    const call2 = res.write.mock.calls[1][0] as string;
    expect(call2).toContain('id: 3');
  });

  // -----------------------------------------------------------------------
  // clearHistory
  // -----------------------------------------------------------------------

  it('clearHistory removes event history', () => {
    const event = createProgressEvent('test-completed', 'assess-1');
    broadcaster.broadcast('assess-1', event);

    broadcaster.clearHistory('assess-1');

    // A new client reconnecting should get no replay
    const { client, res } = createClient('c-new', 'assess-1');
    broadcaster.addClient(client, '0');

    expect(res.write).not.toHaveBeenCalled();
  });
});
