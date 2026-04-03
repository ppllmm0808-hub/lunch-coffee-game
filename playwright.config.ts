import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: process.env.TEST_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    // 모바일 우선 — 이 게임의 주 사용 환경
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
    // 데스크톱도 검사
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
  ],
  // 테스트 전 dev 서버 자동 실행
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
