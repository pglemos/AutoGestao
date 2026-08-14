import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER === '1';
const reuseWebServer = process.env.PLAYWRIGHT_REUSE_SERVER === '1';
const playwrightPort = process.env.PLAYWRIGHT_PORT || '3107';
const baseURL = process.env.VITE_APP_URL || `http://localhost:${playwrightPort}`;

/**
 * MX Performance E2E + Visual Regression Configuration
 */
export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  snapshotDir: './e2e/visual/__screenshots__',
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.1,
    },
  },

  projects: [
    {
      name: 'chromium',
      testDir: './src/test',
      testMatch: /.*\.playwright\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      testDir: './src/test',
      testMatch: /.*\.playwright\.ts/,
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'visual-desktop',
      testDir: './e2e/visual',
      testMatch: /(?<!manager-module)\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'visual-tablet',
      testDir: './e2e/visual',
      testMatch: /(?<!manager-module)\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'visual-mobile',
      testDir: './e2e/visual',
      testMatch: /(?<!manager-module)\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 320, height: 568 },
      },
    },
    {
      name: 'visual-mobile-360',
      testDir: './e2e/visual',
      testMatch: /(?<!manager-module)\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 800 },
      },
    },
    {
      name: 'visual-mobile-412',
      testDir: './e2e/visual',
      testMatch: /(?<!manager-module)\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 412, height: 915 },
      },
    },
    {
      name: 'manager-visual-desktop',
      testDir: './e2e/visual',
      testMatch: /manager-module\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'manager-visual-tablet',
      testDir: './e2e/visual',
      testMatch: /manager-module\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'manager-visual-mobile',
      testDir: './e2e/visual',
      testMatch: /manager-module\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],

  webServer: skipWebServer
    ? undefined
    : {
        command: `VITE_ENABLE_DEV_AUTH_BYPASS=true npx vite --port=${playwrightPort} --host=0.0.0.0`,
        url: baseURL,
        reuseExistingServer: reuseWebServer,
      },
});
