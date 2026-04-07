#!/bin/bash
# ============================================================
# 점심 사기 게임 — 최초 셋업 스크립트
# 실행: bash setup.sh
# ============================================================

set -e  # 에러 시 즉시 중단

echo "🍱 점심 사기 게임 셋업 시작..."
echo ""

# 1. Node.js 확인
if ! command -v node &> /dev/null; then
  echo "❌ Node.js가 없습니다. https://nodejs.org 에서 설치하세요."
  exit 1
fi
echo "✅ Node.js $(node -v)"

# 2. 의존성 설치
echo ""
echo "📦 패키지 설치 중..."
npm install

# 3. Playwright 브라우저 설치 (자동 테스트용)
echo ""
echo "🎭 Playwright 브라우저 설치 중..."
npx playwright install chromium --with-deps

# 4. .env.local 파일 생성 (없을 때만)
if [ ! -f .env.local ]; then
  echo ""
  echo "⚙️  .env.local 파일 생성 중..."
  cp .env.local.example .env.local
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚠️  .env.local 파일에 Supabase 키를 입력하세요:"
  echo ""
  echo "  1. https://supabase.com 접속 → 새 프로젝트 생성"
  echo "  2. Settings > API 탭 열기"
  echo "  3. Project URL → NEXT_PUBLIC_SUPABASE_URL 에 붙여넣기"
  echo "  4. anon public key → NEXT_PUBLIC_SUPABASE_ANON_KEY 에 붙여넣기"
  echo ""
  echo "  그 다음 supabase-schema.sql 을 Supabase SQL Editor에서 실행"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
  echo "✅ .env.local 이미 존재"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 셋업 완료!"
echo ""
echo "다음 단계:"
echo "  1. .env.local 파일에 Supabase 키 입력"
echo "  2. Supabase SQL Editor에서 supabase-schema.sql 실행"
echo "  3. npm run dev  ← 로컬 실행"
echo "  4. npm test     ← 자동 테스트"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
