import { defineConfig } from '@playwright/test'

const deployedBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.replace(/\/+$/, '')
const localBaseUrl = 'http://127.0.0.1:4173'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: deployedBaseUrl ?? localBaseUrl,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'emulated-chromium-mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 320, height: 760 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: deployedBaseUrl
    ? undefined
    : {
        command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
        url: localBaseUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
})
