// Custom Express server hosting the Next.js frontend and backend API.

import express from 'express';
import next from 'next';
import path from 'node:path';
import { readdir } from 'node:fs/promises';
import { healthRoutes } from '@/server/routes/health';
import { assessmentRoutes } from '@/server/routes/assessments';
import { securityHeaders } from '@/server/middleware/security-headers';
import { requestLogger } from '@/server/middleware/request-logger';
import { createRateLimiter } from '@/server/middleware/rate-limiter';
import { SessionManager } from '@/engine/session-manager';
import { DiscoveryService } from '@/engine/discovery-service';
import { TestRunner } from '@/engine/test-runner';
import { SSEBroadcaster } from '@/engine/sse-broadcaster';
import { TestRegistry } from '@/engine/registry/registry';
import { registerAllModules } from '@/engine/registry/index';
import { ResultStore } from '@/engine/result-store';
import { SchemaValidator } from '@/engine/schema-validator';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

async function main() {
  await app.prepare();

  const server = express();

  // --- Global middleware ---
  server.use(securityHeaders());
  server.use(requestLogger());
  server.use(express.json());
  server.use('/api', createRateLimiter({ windowMs: 60_000, maxRequests: 60 }));

  // --- Load JSON schemas for response validation (ADR-005) ---
  const schemaValidator = new SchemaValidator();
  const schemasDir = path.join(import.meta.dirname, '../../schemas');
  try {
    const entries = await readdir(schemasDir);
    const hasSchemaFiles = entries.some(
      (e) => e.endsWith('.json') || !e.startsWith('.'),
    );
    if (hasSchemaFiles) {
      await schemaValidator.loadSchemas(schemasDir);
      console.log(
        `Loaded ${schemaValidator.getSchemaIds().length} JSON schemas from ${schemasDir}`,
      );
    } else {
      console.warn(
        'WARNING: schemas directory is empty. Run "npm run fetch-schemas" to populate it.',
      );
    }
  } catch (err) {
    console.warn(
      `WARNING: Could not load schemas from ${schemasDir}: ${(err as Error).message}. ` +
        'Schema validation will be unavailable. Run "npm run fetch-schemas" to populate the schemas directory.',
    );
  }

  // --- Instantiate engine dependencies ---
  const sessionManager = new SessionManager();
  const discoveryService = new DiscoveryService();
  const registry = TestRegistry.getInstance();
  registerAllModules(registry);
  console.log(`Registered ${registry.getAllClasses().length} conformance class test modules`);
  const testRunner = new TestRunner(registry);
  const sseBroadcaster = new SSEBroadcaster();
  const resultStore = new ResultStore(
    process.env.CSAPI_RESULT_DIR ?? './data/results',
  );

  // --- API routes ---
  server.use('/api', healthRoutes());
  server.use(
    '/api/assessments',
    assessmentRoutes({
      sessionManager,
      discoveryService,
      testRunner,
      sseBroadcaster,
      resultStore,
    }),
  );

  // --- Next.js handles everything else ---
  server.all('*', (req, res) => handle(req, res));

  const port = parseInt(process.env.CSAPI_PORT || '3000', 10);
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    sessionManager.shutdown();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(console.error);
