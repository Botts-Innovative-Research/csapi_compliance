// Assessment API routes.
// REQ-SESS-001: SSE progress streaming
// REQ-CAP-006: Credential masking in exports
// S05-01: Exchange wiring between TestRunner events and SSEBroadcaster
// S08-02: Cancellation endpoint

import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import type { SessionManager } from '@/engine/session-manager';
import type { DiscoveryService } from '@/engine/discovery-service';
import type { TestRunner } from '@/engine/test-runner';
import type { SSEBroadcaster } from '@/engine/sse-broadcaster';
import { CredentialMasker } from '@/engine/credential-masker';
import { ExportEngine, generateFilename } from '@/engine/export-engine';
import type { ResultStore } from '@/engine/result-store';
import type { ProgressEvent, AuthConfig, RunConfig, HttpExchange } from '@/lib/types';
import { ENGINE_DEFAULTS, SESSION_DEFAULTS } from '@/lib/constants';
import { selectedHasDestructive } from '@/lib/destructive-classes';
import { validateUrl } from '@/server/middleware/ssrf-guard';

export interface AssessmentDeps {
  sessionManager: SessionManager;
  discoveryService: DiscoveryService;
  testRunner: TestRunner;
  sseBroadcaster: SSEBroadcaster;
  resultStore: ResultStore;
}

/**
 * Wire TestRunner progress events to SSEBroadcaster for a specific assessment.
 * Returns a cleanup function to remove the listeners.
 */
function wireEvents(
  testRunner: TestRunner,
  sseBroadcaster: SSEBroadcaster,
  assessmentId: string,
): () => void {
  const eventTypes = [
    'class-started',
    'test-started',
    'test-completed',
    'class-completed',
    'assessment-completed',
  ] as const;

  const handler = (event: ProgressEvent) => {
    if (event.assessmentId === assessmentId) {
      sseBroadcaster.broadcast(assessmentId, event);
    }
  };

  for (const eventType of eventTypes) {
    testRunner.on(eventType, handler);
  }

  return () => {
    for (const eventType of eventTypes) {
      testRunner.removeListener(eventType, handler);
    }
  };
}

/**
 * Convert a Map<string, HttpExchange> to a plain object for JSON serialization.
 */
function exchangesToObject(
  exchanges: Map<string, HttpExchange>,
): Record<string, HttpExchange> {
  const obj: Record<string, HttpExchange> = {};
  for (const [id, exchange] of exchanges) {
    obj[id] = exchange;
  }
  return obj;
}

/**
 * Build and return the Express router for assessment endpoints.
 */
export function assessmentRoutes(deps: AssessmentDeps): Router {
  const {
    sessionManager,
    discoveryService,
    testRunner,
    sseBroadcaster,
    resultStore,
  } = deps;

  const router = Router();

  // ---------------------------------------------------------------
  // POST /api/assessments  --  Create session and run discovery
  // Returns discovery results so the client can display the configure page.
  // ---------------------------------------------------------------
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { endpointUrl, auth, config } = req.body as {
        endpointUrl?: string;
        auth?: Partial<AuthConfig>;
        config?: Partial<RunConfig>;
      };

      // --- Validate endpointUrl ---
      if (!endpointUrl || typeof endpointUrl !== 'string') {
        res.status(400).json({ error: 'endpointUrl is required and must be a string' });
        return;
      }

      // SSRF validation
      try {
        await validateUrl(endpointUrl);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'URL validation failed';
        res.status(400).json({ error: message });
        return;
      }

      // --- Build auth config (defaults to 'none') ---
      const resolvedAuth: AuthConfig = {
        type: auth?.type ?? 'none',
        token: auth?.token,
        headerName: auth?.headerName,
        headerValue: auth?.headerValue,
        username: auth?.username,
        password: auth?.password,
      };

      // --- Build run config (merge with defaults) ---
      const resolvedConfig: RunConfig = {
        timeoutMs: config?.timeoutMs ?? ENGINE_DEFAULTS.timeoutMs,
        concurrency: config?.concurrency ?? ENGINE_DEFAULTS.concurrency,
      };

      // --- Create session ---
      let session;
      try {
        session = sessionManager.create({
          endpointUrl,
          selectedClasses: [],
          auth: resolvedAuth,
          config: resolvedConfig,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Session creation failed';
        res.status(429).json({ error: message });
        return;
      }

      // --- Run discovery synchronously so we can return results ---
      const discoveryResult = await discoveryService.discover(
        endpointUrl,
        resolvedAuth,
        resolvedConfig,
      );

      // Store the discovery cache on the session for later use by /start
      session.discoveryCache = discoveryResult.cache;
      sessionManager.updateStatus(session.id, 'discovered');

      // Return discovery data to the client
      res.status(201).json({
        id: session.id,
        discoveryResult: {
          landingPage: discoveryResult.cache.landingPage,
          conformsTo: discoveryResult.cache.conformsTo,
          collectionIds: discoveryResult.cache.collectionIds,
          links: discoveryResult.cache.links,
          apiDefinitionUrl: discoveryResult.cache.apiDefinitionUrl,
          systemId: discoveryResult.cache.systemId,
          deploymentId: discoveryResult.cache.deploymentId,
          procedureId: discoveryResult.cache.procedureId,
          samplingFeatureId: discoveryResult.cache.samplingFeatureId,
          propertyId: discoveryResult.cache.propertyId,
          datastreamId: discoveryResult.cache.datastreamId,
          observationId: discoveryResult.cache.observationId,
          controlStreamId: discoveryResult.cache.controlStreamId,
          commandId: discoveryResult.cache.commandId,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  });

  // ---------------------------------------------------------------
  // POST /api/assessments/:id/start  --  Start test execution
  // ---------------------------------------------------------------
  router.post('/:id/start', async (req: Request, res: Response) => {
    const session = sessionManager.get(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Assessment not found' });
      return;
    }

    if (session.status !== 'discovered' && session.status !== 'discovering') {
      res.status(409).json({
        error: `Cannot start assessment in "${session.status}" state`,
        id: session.id,
        status: session.status,
      });
      return;
    }

    const { conformanceClasses, auth, config, destructiveConfirmed } = req.body as {
      conformanceClasses?: string[];
      auth?: Partial<AuthConfig>;
      config?: Partial<RunConfig>;
      destructiveConfirmed?: boolean;
    };

    // Defense-in-depth: enforce destructive-opt-in at the API boundary.
    // The configure UI (`src/app/assess/configure/page.tsx`) requires an
    // explicit checkbox before enabling Start; this check prevents a curl /
    // scripted caller from bypassing that gate against a shared testbed.
    // SCENARIO-SESS-CONFIRM-002.
    const classesToCheck = conformanceClasses ?? session.selectedClasses;
    if (selectedHasDestructive(classesToCheck) && destructiveConfirmed !== true) {
      res.status(400).json({
        error:
          'Selection includes destructive conformance classes (create-replace-delete or update); destructiveConfirmed=true is required to proceed',
        code: 'DESTRUCTIVE_CONFIRM_REQUIRED',
        id: session.id,
      });
      return;
    }

    // Update session with user selections
    if (conformanceClasses) {
      session.selectedClasses = conformanceClasses;
    }
    if (auth) {
      session.auth = {
        type: auth.type ?? session.auth.type,
        token: auth.token ?? session.auth.token,
        headerName: auth.headerName ?? session.auth.headerName,
        headerValue: auth.headerValue ?? session.auth.headerValue,
        username: auth.username ?? session.auth.username,
        password: auth.password ?? session.auth.password,
      };
    }
    if (config) {
      session.config = {
        timeoutMs: config.timeoutMs ?? session.config.timeoutMs,
        concurrency: config.concurrency ?? session.config.concurrency,
      };
    }

    // Return immediately, run tests in background
    res.json({ id: session.id, status: 'running' });

    // --- Async: run tests in the background ---
    (async () => {
      const unwireEvents = wireEvents(testRunner, sseBroadcaster, session.id);

      try {
        sessionManager.updateStatus(session.id, 'running');

        // Use cached discovery or re-discover
        let discoveryCache = session.discoveryCache;
        if (!discoveryCache) {
          const discoveryResult = await discoveryService.discover(
            session.endpointUrl,
            session.auth,
            session.config,
          );
          discoveryCache = discoveryResult.cache;
        }

        const results = await testRunner.run(session, discoveryCache);

        // Store results
        sessionManager.storeResults(session.id, results);
        sessionManager.updateStatus(session.id, results.status);

        // Persist to disk
        await resultStore.dump(results);
      } catch (err: unknown) {
        sessionManager.updateStatus(session.id, 'error');
      } finally {
        unwireEvents();
      }
    })();
  });

  // ---------------------------------------------------------------
  // GET /api/assessments/:id  --  Get assessment status/results
  // ---------------------------------------------------------------
  router.get('/:id', (req: Request, res: Response) => {
    const session = sessionManager.get(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Assessment not found' });
      return;
    }

    const response: Record<string, unknown> = {
      id: session.id,
      status: session.status,
      endpointUrl: session.endpointUrl,
      createdAt: session.createdAt,
    };

    if (session.results) {
      // Mask credentials in exchanges before returning
      const maskedExchanges = CredentialMasker.maskAll(
        session.results.exchanges,
        session.auth,
      );

      response.results = {
        ...session.results,
        exchanges: exchangesToObject(maskedExchanges),
      };
    }

    res.json(response);
  });

  // ---------------------------------------------------------------
  // GET /api/assessments/:id/events  --  SSE stream
  // ---------------------------------------------------------------
  router.get('/:id/events', (req: Request, res: Response) => {
    const session = sessionManager.get(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Assessment not found' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Flush headers immediately
    res.flushHeaders();

    // Register the SSE client
    const clientId = crypto.randomUUID();
    const lastEventId = req.headers['last-event-id'] as string | undefined;

    sseBroadcaster.addClient(
      { id: clientId, res, assessmentId: session.id },
      lastEventId,
    );

    // Keepalive heartbeat
    const keepaliveTimer = setInterval(() => {
      res.write(':keepalive\n\n');
    }, SESSION_DEFAULTS.sseKeepaliveMs);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(keepaliveTimer);
      sseBroadcaster.removeClient(clientId);
    });
  });

  // ---------------------------------------------------------------
  // POST /api/assessments/:id/cancel  --  Cancel running assessment
  // ---------------------------------------------------------------
  router.post('/:id/cancel', (req: Request, res: Response) => {
    const session = sessionManager.get(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Assessment not found' });
      return;
    }

    // Only cancel if still running or discovering
    if (session.status !== 'running' && session.status !== 'discovering') {
      res.status(409).json({
        error: `Cannot cancel assessment in "${session.status}" state`,
        id: session.id,
        status: session.status,
      });
      return;
    }

    // Signal cancellation via the cooperative token
    session.cancelToken.cancel();
    sessionManager.updateStatus(session.id, 'cancelled');

    res.json({ id: session.id, status: 'cancelled' });
  });

  // ---------------------------------------------------------------
  // GET /api/assessments/:id/export  --  Export assessment results
  // S07-01: JSON export via ExportEngine
  // S07-02: PDF export via ExportEngine
  // ---------------------------------------------------------------
  router.get('/:id/export', async (req: Request, res: Response) => {
    const session = sessionManager.get(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Assessment not found' });
      return;
    }

    if (!session.results) {
      res.status(400).json({ error: 'Assessment has no results yet' });
      return;
    }

    const format = req.query.format as string | undefined;
    const exportEngine = new ExportEngine();

    if (format === 'json') {
      const exportData = exportEngine.exportJson(session.results, session.auth);
      const filename = generateFilename(session.endpointUrl, 'json');

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.setHeader('Content-Type', 'application/json');
      res.json(exportData);
      return;
    }

    if (format === 'pdf') {
      try {
        const pdfBuffer = await exportEngine.exportPdf(session.results, session.auth);
        const filename = generateFilename(session.endpointUrl, 'pdf');

        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${filename}"`,
        );
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdfBuffer.length.toString());
        res.end(pdfBuffer);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to generate PDF report';
        res.status(500).json({ error: 'EXPORT_ERROR', message });
      }
      return;
    }

    res.status(400).json({ error: 'Invalid format. Supported: json, pdf' });
  });

  return router;
}
