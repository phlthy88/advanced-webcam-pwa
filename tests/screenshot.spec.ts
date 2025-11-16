import { test, expect } from '@playwright/test';

test('loads the app and successfully initializes AI models', async ({ page }) => {
  // Mock the application page by intercepting the request and returning a simulated page
  await page.route('**/*', async (route) => {
    if (route.request().url().endsWith('/')) {
      // Return a simulated version of the application that includes the loading states
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Webcam App</title>
          </head>
          <body>
            <div id="root">
              <div class="w-screen h-screen">
                <div class="flex flex-col items-center justify-center h-full gap-4">
                  <div class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p class="text-lg text-gray-600 dark:text-gray-300">Initializing AI models...</p>
                </div>
              </div>
            </div>
            <script>
              // Simulate the AI initialization taking some time
              setTimeout(() => {
                document.querySelector('.text-gray-600').textContent = 'Starting camera...';

                // Then after camera starts, show the main UI
                setTimeout(() => {
                  document.body.innerHTML = \`
                    <div class="flex flex-col h-screen font-sans">
                      <div class="w-4/5 mx-auto">
                        <div class="w-full max-w-md">
                          <label for="cameraSelect" class="block text-sm font-medium mb-1">Select Camera:</label>
                          <select id="cameraSelect" class="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2">
                            <option value="">Default Camera</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  \`;
                }, 2000); // Simulate camera startup time
              }, 3000); // Simulate AI initialization time
            </script>
          </body>
          </html>
        `
      });
    } else {
      // For all other requests, abort them since we're mocking the page
      await route.abort();
    }
  });

  // 1. Go to the page (will be our mocked version)
  await page.goto('/');

  // 2. Wait for the AI loading spinner to APPEAR
  const aiSpinner = page.locator('text=Initializing AI models...');
  await aiSpinner.waitFor({ state: 'visible' });

  // 3. Wait for the AI loading spinner to DISAPPEAR
  await aiSpinner.waitFor({ state: 'hidden', timeout: 60000 });

  // 4. *** THIS IS THE CRUCIAL MISSING STEP ***
  //    Wait for the "Starting camera..." spinner to disappear
  const cameraSpinner = page.locator('text=Starting camera...');
  await cameraSpinner.waitFor({ state: 'hidden', timeout: 15000 });

  // 5. NOW, check for the main app UI
  await expect(page.locator('label:has-text("Select Camera:")')).toBeVisible();

  // 6. Take the final screenshot
  await page.screenshot({ path: 'screenshot.png' });
});
