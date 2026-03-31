// Health check route.
// Backend API: GET /api/health — returns { status: 'ok' }

import { Router } from 'express';

export function healthRoutes(): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return router;
}
