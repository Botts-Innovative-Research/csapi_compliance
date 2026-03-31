import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/CS API Compliance Assessor/);
  });

  test('displays the main heading', async ({ page }) => {
    const heading = page.getByRole('heading', {
      name: /OGC Connected Systems API Compliance Assessor/,
    });
    await expect(heading).toBeVisible();
  });

  test('URL input field is visible and focusable', async ({ page }) => {
    const input = page.locator('#endpoint-url');
    await expect(input).toBeVisible();
    await input.focus();
    await expect(input).toBeFocused();
  });

  test('URL input has correct placeholder', async ({ page }) => {
    const input = page.locator('#endpoint-url');
    await expect(input).toHaveAttribute(
      'placeholder',
      'https://api.example.com/ogc/csapi',
    );
  });

  test('demo server link fills the input', async ({ page }) => {
    const demoLink = page.getByRole('button', {
      name: /api\.georobotix\.io/,
    });
    await expect(demoLink).toBeVisible();
    await demoLink.click();

    const input = page.locator('#endpoint-url');
    await expect(input).toHaveValue(
      'https://api.georobotix.io/ogc/t18/api',
    );
  });

  test('invalid URL shows validation error after blur', async ({ page }) => {
    const input = page.locator('#endpoint-url');
    await input.fill('not-a-url');
    await input.blur();

    const error = page.locator('#url-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText('Enter a valid HTTP or HTTPS URL');
  });

  test('ftp URL shows validation error', async ({ page }) => {
    const input = page.locator('#endpoint-url');
    await input.fill('ftp://example.com');
    await input.blur();

    const error = page.locator('#url-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText('Enter a valid HTTP or HTTPS URL');
  });

  test('empty submit is prevented - button disabled when empty', async ({
    page,
  }) => {
    const button = page.getByRole('button', { name: /Discover Endpoint/ });
    await expect(button).toBeDisabled();
  });

  test('button becomes enabled with valid URL', async ({ page }) => {
    const input = page.locator('#endpoint-url');
    await input.fill('https://example.com/api');

    const button = page.getByRole('button', { name: /Discover Endpoint/ });
    await expect(button).toBeEnabled();
  });

  test('button stays disabled with invalid URL', async ({ page }) => {
    const input = page.locator('#endpoint-url');
    await input.fill('not-a-valid-url');

    const button = page.getByRole('button', { name: /Discover Endpoint/ });
    await expect(button).toBeDisabled();
  });

  test('"New Assessment" nav link is present', async ({ page }) => {
    const navLink = page.getByRole('link', { name: /New Assessment/ });
    await expect(navLink).toBeVisible();
    await expect(navLink).toHaveAttribute('href', '/');
  });

  test('disclaimer footer is visible', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText(
      'This tool is unofficial and does not constitute OGC certification',
    );
  });

  test('page is keyboard navigable', async ({ page }) => {
    // The URL input auto-focuses on load; start tabbing from there
    const input = page.locator('#endpoint-url');
    await expect(input).toBeFocused();

    // Tab through interactive elements -- verify focus moves
    await page.keyboard.press('Tab');
    // After input, next focusable should be the submit button
    const button = page.getByRole('button', { name: /Discover Endpoint/ });
    await expect(button).toBeFocused();

    // Tab again should reach the demo URL button
    await page.keyboard.press('Tab');
    const demoButton = page.getByRole('button', {
      name: /api\.georobotix\.io/,
    });
    await expect(demoButton).toBeFocused();
  });

  test('input shows red border on validation error', async ({ page }) => {
    const input = page.locator('#endpoint-url');
    await input.fill('bad-url');
    await input.blur();

    // aria-invalid should be set to true
    await expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  test('error message has alert role', async ({ page }) => {
    const input = page.locator('#endpoint-url');
    await input.fill('not-a-url');
    await input.blur();

    const error = page.locator('[role="alert"]');
    await expect(error).toBeVisible();
  });

  test('page has proper landmarks', async ({ page }) => {
    // Verify semantic landmarks for accessibility
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
  });

  test('three feature items are displayed', async ({ page }) => {
    await expect(
      page.getByText('Auto-discovers conformance classes'),
    ).toBeVisible();
    await expect(page.getByText('Tests 103 requirements')).toBeVisible();
    await expect(
      page.getByText('Exports JSON & PDF reports'),
    ).toBeVisible();
  });
});
