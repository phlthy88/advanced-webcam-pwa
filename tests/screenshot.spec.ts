import { test, expect } from '@playwright/test';

test('loads the app and successfully initializes AI models', async ({ page }) => {
  // 1. Go to the page (uses baseURL from config)
  await page.goto('/');

  // 2. Wait for the AI loading spinner to APPEAR
  const aiSpinner = page.locator('text=Initializing AI models...');
  await aiSpinner.waitFor({ state: 'visible' });

  // 3. Wait for the AI loading spinner to DISAPPEAR
  await aiSpinner.waitFor({ state: 'hidden', timeout: 60000 });

  // 4. Wait for the *camera* spinner to disappear
  const cameraSpinner = page.locator('text=Starting camera...');
  await cameraSpinner.waitFor({ state: 'hidden', timeout: 15000 });

  await page.screenshot({ path: 'debug_screenshot.png' });

  // 5. NOW, check for the main app UI
  await expect(page.locator('label:has-text("Select Camera")')).toBeVisible();

  // 6. Take the final screenshot
  await page.screenshot({ path: 'screenshot.png' });
});
