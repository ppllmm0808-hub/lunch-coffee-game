// ============================================================
// Playwright 자동 테스트 — 전체 게임 흐름 검증
// Claude Code에게 "이 테스트 실행해줘" 하면 자동으로 클릭
//
// 실행: npx playwright test
// ============================================================

import { test, expect, Browser, Page } from '@playwright/test'

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'

test.describe('점심 사기 게임 전체 흐름', () => {

  test('방 생성 → QR/코드로 2명 입장 → 3라운드 → 결과 확인', async ({ browser }) => {

    // ── 1. 방장 브라우저 ──
    const hostCtx = await browser.newContext()
    const hostPage = await hostCtx.newPage()
    await hostPage.goto(BASE_URL)

    // 방 만들기
    await hostPage.click('text=방 만들기')
    await hostPage.fill('input[placeholder="예: 점심왕"]', '방장테스트')
    await hostPage.fill('input[type="number"]', '40000')
    await hostPage.click('text=방 생성하기')

    // 대기실 도달 확인
    await expect(hostPage.locator('text=대기실')).toBeVisible({ timeout: 5000 })
    const roomCode = await hostPage.locator('strong').first().textContent()
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/)
    console.log(`생성된 방 코드: ${roomCode}`)

    // ── 2. 참가자 브라우저 ──
    const guestCtx = await browser.newContext()
    const guestPage = await guestCtx.newPage()
    await guestPage.goto(BASE_URL)

    await guestPage.click('text=방 참여하기')
    await guestPage.fill('input[placeholder="예: 밥도둑"]', '참가자테스트')
    await guestPage.fill('input[placeholder="ABC123"]', roomCode!)
    await guestPage.click('text=입장하기')

    await expect(guestPage.locator('text=대기실')).toBeVisible({ timeout: 5000 })

    // ── 3. 게임 시작 (방장) ──
    await expect(hostPage.locator('text=게임 시작')).toBeEnabled({ timeout: 3000 })
    await hostPage.click('text=게임 시작')

    // ── 4. 라운드 1 ──
    await expect(hostPage.locator('text=라운드 1')).toBeVisible({ timeout: 5000 })
    await hostPage.fill('input[placeholder="입력하세요"]', '40')
    await hostPage.click('text=선택 확정')

    await expect(guestPage.locator('text=라운드 1')).toBeVisible({ timeout: 5000 })
    await guestPage.fill('input[placeholder="입력하세요"]', '55')
    await guestPage.click('text=선택 확정')

    // ── 5. 방장이 다음으로 넘기기 ──
    await expect(hostPage.locator('text=라운드 2 시작')).toBeVisible({ timeout: 10000 })
    await hostPage.click('text=라운드 2 시작')

    // ── 6. 라운드 2, 3 반복 ──
    for (const round of [2, 3]) {
      await expect(hostPage.locator(`text=라운드 ${round}`)).toBeVisible({ timeout: 5000 })
      await hostPage.fill('input[placeholder="입력하세요"]', '테스트답변')
      await hostPage.click('text=선택 확정')
      await guestPage.fill('input[placeholder="입력하세요"]', '다른답변')
      await guestPage.click('text=선택 확정')

      const nextText = round < 3 ? `라운드 ${round + 1} 시작` : '최종 결과 보기'
      await expect(hostPage.locator(`text=${nextText}`)).toBeVisible({ timeout: 10000 })
      await hostPage.click(`text=${nextText}`)
    }

    // ── 7. 최종 결과 확인 ──
    await expect(hostPage.locator('text=최종 결과')).toBeVisible({ timeout: 5000 })
    await expect(hostPage.locator('text=40,000원')).toBeVisible()
    await expect(guestPage.locator('text=최종 결과')).toBeVisible({ timeout: 5000 })

    console.log('✅ 전체 게임 흐름 테스트 통과')

    await hostCtx.close()
    await guestCtx.close()
  })

  test('홈 화면 기본 렌더링', async ({ page }) => {
    await page.goto(BASE_URL)
    await expect(page.locator('text=점심 사기 게임')).toBeVisible()
    await expect(page.locator('text=방 만들기')).toBeVisible()
    await expect(page.locator('text=방 참여하기')).toBeVisible()
  })

  test('존재하지 않는 방 코드 입장 시 에러 표시', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.click('text=방 참여하기')
    await page.fill('input[placeholder="예: 밥도둑"]', '테스터')
    await page.fill('input[placeholder="ABC123"]', 'ZZZZZZ')
    await page.click('text=입장하기')
    await expect(page.locator('text=방을 찾을 수 없습니다')).toBeVisible({ timeout: 5000 })
  })

})
