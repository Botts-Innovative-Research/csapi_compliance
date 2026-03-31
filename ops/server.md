# Server & Infrastructure — CS API Compliance Assessor

> Last updated: 2026-03-31

## Access

- **SSH**: N/A (Docker-based deployment)
- **URL**: http://localhost:3000 (development), configurable via `PORT` environment variable

## Services

| Service | Port | Runtime | Notes |
|---------|------|---------|-------|
| Next.js App (frontend + API) | 3000 | Docker / Node.js 22 | Combined SSR frontend and Express API server |
| Assessment Engine | (in-process) | Node.js 22 | Runs within the Next.js server process |
| Result Store | (filesystem) | File-backed JSON | Results persisted to `data/results/` with 24h TTL |

## Credentials

| Account | Username | Password | Used For |
|---------|----------|----------|----------|
| N/A | N/A | N/A | No authentication required — the tool is login-free by design (REQ-SESS-013) |

## Common Operations

```bash
# Start development server
npm run dev

# Run unit tests
npm test

# Run unit tests in watch mode
npm run test:watch

# Run E2E tests (requires running server)
npx playwright test

# Run performance benchmarks
npm run perf

# Build production Docker image
docker build -t csapi-compliance .

# Start production container
docker run -p 3000:3000 csapi-compliance

# View logs from running container
docker logs -f <container-id>

# Export assessment results (via API)
curl http://localhost:3000/api/assessments/<id>/export?format=json -o results.json
curl http://localhost:3000/api/assessments/<id>/export?format=pdf -o results.pdf
```
