import { defineConfig, devices } from '@playwright/test';
import { randomBytes, scryptSync } from 'node:crypto';

// Test-only admin credentials. The server under test uses its own throwaway data folder,
// so tests never touch your real content.
export const TEST_ADMIN = { email: 'admin@test.local', password: 'test-password-for-ci-only' };

const PORT = Number(process.env.PORT ?? 3100);
const salt = randomBytes(16);
const testHash = ['scrypt', 16384, 8, 1, salt.toString('base64url'), scryptSync(TEST_ADMIN.password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('base64url')].join(':');

const launchOptions = process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {};

export default defineConfig({
  testDir: './tests',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions,
  },
  projects: [
    { name: 'site-desktop', testMatch: /site\.spec\.ts/, fullyParallel: true, use: { ...devices['Desktop Chrome'], launchOptions } },
    { name: 'site-mobile', testMatch: /site\.spec\.ts/, fullyParallel: true, use: { ...devices['Pixel 7'], launchOptions } },
    // Admin tests change content, so they run one at a time after the public checks.
    { name: 'admin', testMatch: /admin\.spec\.ts/, fullyParallel: false, dependencies: ['site-desktop', 'site-mobile'], use: { ...devices['Desktop Chrome'], launchOptions } },
  ],
  workers: process.env.CI ? 2 : undefined,
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `node -e "require('fs').rmSync('.data-test',{recursive:true,force:true})" && npm run build && npx next start -p ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: false,
        timeout: 240_000,
        env: {
          DATA_DIR: '.data-test',
          ADMIN_EMAIL: TEST_ADMIN.email,
          ADMIN_PASSWORD_HASH: testHash,
          SESSION_SECRET: randomBytes(32).toString('base64url'),
          DISABLE_RATE_LIMIT: '1',
          NEXT_TELEMETRY_DISABLED: '1',
          // Make sure a developer's real storage is never used by the test server.
          UPSTASH_REDIS_REST_URL: '',
          UPSTASH_REDIS_REST_TOKEN: '',
          KV_REST_API_URL: '',
          KV_REST_API_TOKEN: '',
          BLOB_READ_WRITE_TOKEN: '',
          RESEND_API_KEY: '',
        },
      },
});
