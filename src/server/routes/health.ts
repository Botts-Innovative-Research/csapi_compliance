// Health check route.
// Backend API: GET /api/health — returns { status: 'ok', allowPrivateNetworks: boolean }
// The allowPrivateNetworks flag lets the UI show a "local-dev mode" banner so
// users understand the SSRF guard is relaxed. REQ-SSRF-002.

import { Router } from 'express';

export function healthRoutes(): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      allowPrivateNetworks: process.env.ALLOW_PRIVATE_NETWORKS === 'true',
    });
  });

  return router;
}
