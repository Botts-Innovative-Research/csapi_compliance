import { test, expect } from '@playwright/test';

test.describe('Assessment Flow', () => {
  test('health endpoint returns ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('status', 'ok');
  });

  test('entering a valid URL and clicking Discover sends POST to /api/assessments', async ({
    page,
  }) => {
    // Intercept the API call to avoid needing a real IUT
    let interceptedRequest: { url: string; method: string; body: string } | null = null;

    await page.route('**/api/assessments', async (route) => {
      const request = route.request();
      interceptedRequest = {
        url: request.url(),
        method: request.method(),
        body: request.postData() || '',
      };

      // Respond with a mock to prevent actual network call
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-session-001',
          endpointUrl: 'https://example.com/api',
          status: 'discovered',
          discoveryResult: {
            landingPage: { title: 'Test API' },
            conformsTo: [],
            collectionIds: [],
            links: [],
          },
        }),
      });
    });

    await page.goto('/');

    const input = page.locator('#endpoint-url');
    await input.fill('https://example.com/api');

    const button = page.getByRole('button', { name: /Discover Endpoint/ });
    await button.click();

    // Wait for the intercepted request
    await page.waitForTimeout(500);

    expect(interceptedRequest).not.toBeNull();
    expect(interceptedRequest!.method).toBe('POST');
    expect(interceptedRequest!.url).toContain('/api/assessments');

    const requestBody = JSON.parse(interceptedRequest!.body);
    expect(requestBody).toHaveProperty('endpointUrl', 'https://example.com/api');
  });

  test('successful discovery redirects to configure page', async ({
    page,
  }) => {
    // Mock the discovery API
    await page.route('**/api/assessments', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-session-002',
          endpointUrl: 'https://example.com/api',
          status: 'discovered',
          discoveryResult: {
            landingPage: { title: 'Test API' },
            conformsTo: [
              'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/core',
            ],
            collectionIds: ['systems'],
            links: [
              {
                rel: 'self',
                href: 'https://example.com/api',
              },
            ],
          },
        }),
      });
    });

    await page.goto('/');

    const input = page.locator('#endpoint-url');
    await input.fill('https://example.com/api');

    const button = page.getByRole('button', { name: /Discover Endpoint/ });
    await button.click();

    // Should redirect to configure page with session param
    await page.waitForURL(/\/assess\/configure\?session=/);
    expect(page.url()).toContain('/assess/configure?session=test-session-002');
  });

  // ----- Full flow tests below require a live IUT -----
  // These are skipped by default. To run them, set the IUT_URL environment
  // variable to a reachable CS API endpoint and remove the .skip() calls.

  test.skip('TC-E2E-001: full happy path with live IUT', async ({ page }) => {
    // Requires: a running IUT (e.g., https://api.georobotix.io/ogc/t18/api)
    // This test exercises the complete flow:
    //   landing -> discover -> configure -> start -> progress -> results
    //
    // To run: IUT_URL=https://api.georobotix.io/ogc/t18/api npx playwright test -g "full happy path"

    const iutUrl =
      process.env.IUT_URL || 'https://api.georobotix.io/ogc/t18/api';

    await page.goto('/');
    await page.locator('#endpoint-url').fill(iutUrl);
    await page.getByRole('button', { name: /Discover Endpoint/ }).click();

    // Wait for redirect to configure page
    await page.waitForURL(/\/assess\/configure/, { timeout: 30000 });

    // Verify conformance classes are displayed
    await expect(page.getByText(/conformance class/i)).toBeVisible();

    // Click Start Assessment
    await page.getByRole('button', { name: /Start Assessment/ }).click();

    // Wait for redirect to progress page
    await page.waitForURL(/\/assess\/[^/]+\/progress/, { timeout: 15000 });
    await expect(
      page.getByText(/Assessment in Progress/i),
    ).toBeVisible();

    // Wait for completion (generous timeout for full test suite)
    await page.waitForURL(/\/assess\/[^/]+\/results/, { timeout: 300000 });

    // Verify results page
    await expect(page.getByText(/Assessment Results/i)).toBeVisible();

    // Verify summary dashboard is present
    await expect(page.getByText(/%/)).toBeVisible();

    // Verify Export JSON button
    const exportBtn = page.getByRole('button', { name: /Export JSON/ });
    await expect(exportBtn).toBeVisible();
  });

  test.skip('TC-E2E-004: cancel assessment', async ({ page }) => {
    // Requires: a running IUT
    // This test starts an assessment and cancels it mid-run.

    const iutUrl =
      process.env.IUT_URL || 'https://api.georobotix.io/ogc/t18/api';

    await page.goto('/');
    await page.locator('#endpoint-url').fill(iutUrl);
    await page.getByRole('button', { name: /Discover Endpoint/ }).click();
    await page.waitForURL(/\/assess\/configure/, { timeout: 30000 });

    await page.getByRole('button', { name: /Start Assessment/ }).click();
    await page.waitForURL(/\/assess\/[^/]+\/progress/, { timeout: 15000 });

    // Click cancel
    await page.getByRole('button', { name: /Cancel Assessment/ }).click();

    // Confirm in dialog
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole('button', { name: /Cancel Assessment/ })
      .click();

    // Should redirect to results page
    await page.waitForURL(/\/assess\/[^/]+\/results/, { timeout: 15000 });

    // Verify partial/cancelled status
    await expect(page.getByText(/Partial|Cancelled/i)).toBeVisible();
    await expect(
      page.getByText(/assessment was cancelled/i),
    ).toBeVisible();
  });

  test.skip('TC-E2E-005: results persistence via URL', async ({ page }) => {
    // Requires: a completed assessment (run TC-E2E-001 first)
    // This test navigates away and back to verify results persist.

    const iutUrl =
      process.env.IUT_URL || 'https://api.georobotix.io/ogc/t18/api';

    // Complete an assessment first
    await page.goto('/');
    await page.locator('#endpoint-url').fill(iutUrl);
    await page.getByRole('button', { name: /Discover Endpoint/ }).click();
    await page.waitForURL(/\/assess\/configure/, { timeout: 30000 });
    await page.getByRole('button', { name: /Start Assessment/ }).click();
    await page.waitForURL(/\/assess\/[^/]+\/results/, { timeout: 300000 });

    // Capture the results URL
    const resultsUrl = page.url();

    // Navigate away
    await page.goto('/');
    await expect(
      page.getByText(/OGC Connected Systems API Compliance Assessor/),
    ).toBeVisible();

    // Navigate back to results
    await page.goto(resultsUrl);
    await expect(page.getByText(/Assessment Results/i)).toBeVisible();
    await expect(page.getByText(/%/)).toBeVisible();
  });
});
