import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  timeout: 120000, // Global timeout of 2 minutes
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    permissions: ['camera'],
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--use-file-for-fake-video-capture=tests/assets/fake-video.mjpeg'
      ]
    },
    actionTimeout: 60000, // 1 minute timeout for actions
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
