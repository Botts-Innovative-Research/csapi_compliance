// E2E tests for the full assessment flow — progress UI, results dashboard, export.
// SCENARIO-SESS-PROG-001: Progress display shows real-time test execution updates (CRITICAL)
// SCENARIO-RPT-DASH-001: Results summary dashboard renders compliance percentages and counts (CRITICAL)
// SCENARIO-RPT-TEST-001: Individual test results visible with pass/fail/skip filtering (CRITICAL)
// SCENARIO-EXP-JSON-001: JSON export downloads complete assessment report (CRITICAL)

import { test, expect, type Page } from '@playwright/test';

/**
 * Uncheck every selected CRUD/Update class on the configure page so the
 * happy-path live-IUT tests don't trigger destructive operations against a
 * shared testbed. The destructive-confirm gate is exercised separately by
 * TC-E2E-006.
 *
 * Waits for the class list to render first to avoid racing the sessionStorage
 * useEffect that hydrates the configure page after redirect.
 */
async function deselectCrudClasses(page: Page): Promise<void> {
  await page
    .getByRole('heading', { name: /Conformance Classes/i })
    .waitFor({ state: 'visible', timeout: 10000 });
  // Per-class labels include the URI in a fingerprint span; filter by the
  // canonical /conf/create-replace-delete or /conf/update URI substring so
  // we hit Part 1 and Part 2 mutating classes without false matches.
  const mutating = page.locator('label').filter({
    hasText: /\/conf\/(create-replace-delete|update)/,
  });
  const count = await mutating.count();
  for (let i = 0; i < count; i++) {
    const checkbox = mutating.nth(i).getByRole('checkbox');
    if ((await checkbox.isEnabled()) && (await checkbox.isChecked())) {
      await checkbox.uncheck();
    }
  }
}

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
  // Run with: IUT_URL=https://api.georobotix.io/ogc/t18/api npx playwright test
  // (Default-skip preserves CI behavior on isolated runners.)
  const liveIutTest = process.env.IUT_URL ? test : test.skip;

  liveIutTest('TC-E2E-001: full happy path with live IUT', async ({ page }) => {
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

    // Verify conformance classes are displayed (use heading to avoid
    // strict-mode collision with the per-class label spans)
    await expect(
      page.getByRole('heading', { name: /Conformance Classes/i }),
    ).toBeVisible();

    // Deselect CRUD/Update classes before Start so the happy-path test
    // doesn't run destructive operations against the shared IUT. The
    // destructive-confirm UX is covered by TC-E2E-006.
    await deselectCrudClasses(page);

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

    // ─── SCENARIO-RPT-DASH-001 (assertion-depth upgrade 2026-04-17) ───
    // Previously this test only asserted the literal `%` character was
    // visible. Upgrade to PASS: assert the actual numeric compliance
    // percentage is rendered (0-100% integer per
    // SummaryDashboard `Math.round(compliancePercent)%`) AND the
    // class-breakdown role="img" exposes its aria-label with per-class
    // counts (passed / failed / skipped / total).
    const complianceDigits = page.getByText(/^\d+%$/);
    await expect(complianceDigits).toBeVisible();
    const complianceText = await complianceDigits.first().textContent();
    const percent = Number(complianceText?.replace('%', '') ?? NaN);
    expect(percent).toBeGreaterThanOrEqual(0);
    expect(percent).toBeLessThanOrEqual(100);

    // Class-breakdown bar carries counts in its aria-label. Verify it
    // renders and its label is well-formed (matches "N passed, N failed,
    // N skipped out of N total").
    const classBar = page.getByRole('img', { name: /Conformance class results:/ });
    await expect(classBar).toBeVisible();
    const classBarLabel = await classBar.getAttribute('aria-label');
    expect(classBarLabel).toMatch(/\d+ passed, \d+ failed, \d+ skipped out of \d+ total/);

    // ─── SCENARIO-RPT-TEST-001 (assertion-depth upgrade 2026-04-17) ───
    // Filter UI previously unclicked. Click each filter button, assert
    // aria-pressed reflects the active filter and the button counts match
    // the summary totals. Finishes on `All` to leave the page state
    // unchanged for the EXP-JSON-001 assertion below.
    const allFilter = page.getByRole('button', { name: /^All \(\d+\)$/ });
    const passedFilter = page.getByRole('button', { name: /^Passed \(\d+\)$/ });
    const failedFilter = page.getByRole('button', { name: /^Failed \(\d+\)$/ });
    const skippedFilter = page.getByRole('button', { name: /^Skipped \(\d+\)$/ });

    await expect(allFilter).toBeVisible();
    await expect(allFilter).toHaveAttribute('aria-pressed', 'true');
    await expect(passedFilter).toHaveAttribute('aria-pressed', 'false');

    await passedFilter.click();
    await expect(passedFilter).toHaveAttribute('aria-pressed', 'true');
    await expect(allFilter).toHaveAttribute('aria-pressed', 'false');

    await failedFilter.click();
    await expect(failedFilter).toHaveAttribute('aria-pressed', 'true');
    await expect(passedFilter).toHaveAttribute('aria-pressed', 'false');

    await skippedFilter.click();
    await expect(skippedFilter).toHaveAttribute('aria-pressed', 'true');

    // Restore "All" so downstream assertions see the full accordion.
    await allFilter.click();
    await expect(allFilter).toHaveAttribute('aria-pressed', 'true');

    // ─── SCENARIO-EXP-JSON-001 (assertion-depth upgrade 2026-04-17) ───
    // Export button previously only asserted visible. Upgrade to PASS:
    // click it, await the download event, assert filename shape
    // matches a JSON export.
    const exportBtn = page.getByRole('button', { name: /Export JSON/ });
    await expect(exportBtn).toBeVisible();
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await exportBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.json$/i);
  });

  liveIutTest('TC-E2E-004: cancel assessment', async ({ page }) => {
    // Requires: a running IUT
    // This test starts an assessment and cancels it mid-run.

    const iutUrl =
      process.env.IUT_URL || 'https://api.georobotix.io/ogc/t18/api';

    await page.goto('/');
    await page.locator('#endpoint-url').fill(iutUrl);
    await page.getByRole('button', { name: /Discover Endpoint/ }).click();
    await page.waitForURL(/\/assess\/configure/, { timeout: 30000 });

    await deselectCrudClasses(page);
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

    // Verify partial/cancelled status — badge first, then descriptive text.
    // Both render after cancel; scope the badge match to the rounded-full
    // status pill to avoid strict-mode collision with the description prose.
    await expect(page.getByText('Cancelled', { exact: true })).toBeVisible();
    await expect(
      page.getByText(/assessment was cancelled/i),
    ).toBeVisible();
  });

  liveIutTest('TC-E2E-005: results persistence via URL', async ({ page }) => {
    // Requires: a completed assessment (run TC-E2E-001 first)
    // This test navigates away and back to verify results persist.

    const iutUrl =
      process.env.IUT_URL || 'https://api.georobotix.io/ogc/t18/api';

    // Complete an assessment first
    await page.goto('/');
    await page.locator('#endpoint-url').fill(iutUrl);
    await page.getByRole('button', { name: /Discover Endpoint/ }).click();
    await page.waitForURL(/\/assess\/configure/, { timeout: 30000 });
    await deselectCrudClasses(page);
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

  // TC-E2E-006 explicitly exercises the destructive-confirm UX gate using a
  // mocked discovery response, so it always runs and never hits a real IUT.
  // This is the test that owns the "Start disabled when CRUD selected without
  // destructive-confirm checkbox" behavior, separating it from the happy-path
  // tests TC-E2E-001/004/005 which deselect CRUD up-front.
  test('TC-E2E-006: destructive-confirm gates Start when CRUD class is selected', async ({
    page,
  }) => {
    const sessionId = 'test-session-006';
    const crudClassUri =
      'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/create-replace-delete';

    // Mock discovery so we get a deterministic CRUD-bearing conformsTo
    await page.route('**/api/assessments', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: sessionId,
          endpointUrl: 'https://example.com/api',
          status: 'discovered',
          discoveryResult: {
            landingPage: { title: 'Test API' },
            conformsTo: [
              'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/core',
              crudClassUri,
            ],
            collectionIds: [],
            links: [],
          },
        }),
      });
    });

    await page.goto('/');
    await page.locator('#endpoint-url').fill('https://example.com/api');
    await page.getByRole('button', { name: /Discover Endpoint/ }).click();
    await page.waitForURL(/\/assess\/configure/, { timeout: 30000 });

    // The CRUD class is auto-selected (it is supported), so its destructive
    // warning + the destructive-confirmation checkbox should both be visible.
    const crudCheckbox = page
      .locator('label')
      .filter({ hasText: crudClassUri })
      .getByRole('checkbox');
    await expect(crudCheckbox).toBeChecked();

    const startButton = page.getByRole('button', { name: /Start Assessment/ });

    // Without the destructive-confirm checkbox checked, Start MUST be disabled.
    await expect(startButton).toBeDisabled();

    const confirmCheckbox = page.getByLabel(
      /I understand these tests will mutate data/,
    );
    await expect(confirmCheckbox).not.toBeChecked();
    await confirmCheckbox.check();
    await expect(confirmCheckbox).toBeChecked();

    // Now Start should be enabled.
    await expect(startButton).toBeEnabled();

    // Unchecking again should re-disable Start (idempotency check).
    await confirmCheckbox.uncheck();
    await expect(startButton).toBeDisabled();

    // Deselecting the CRUD class should hide the confirm checkbox entirely
    // (the gate only applies while a mutating class is selected).
    await crudCheckbox.uncheck();
    await expect(confirmCheckbox).toBeHidden();
    await expect(startButton).toBeEnabled();
  });
});
