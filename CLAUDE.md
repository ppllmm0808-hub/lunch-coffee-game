# CLAUDE.md — 점심 사기 게임 플랫폼

## 프로젝트 한 줄 요약
모임용 QR 게임 플랫폼. MVP = 점심 사기 게임 (2~6명, 3라운드, 점수 비공개, 최종 공개).

## 기술 스택
- Next.js 14 (App Router) + TypeScript
- Supabase (PostgreSQL + Realtime)
- Tailwind CSS (스타일)
- Vercel (자동 배포)
- Playwright (자동 테스트)

## 핵심 설계 원칙
1. **GamePack 인터페이스** — 모든 게임은 src/types/game-pack.ts의 GamePack을 구현
2. **Registry 패턴** — src/packs/index.ts에만 게임 등록. 다른 코드 수정 금지
3. **점수 계산은 서버만** — 클라이언트에서 절대 계산 금지 → /api/round/calculate
4. **DB 접근은 lib/supabase.ts만** — 컴포넌트에서 직접 쿼리 금지

## 새 게임 추가하는 법 (3단계)
1. src/packs/[game-id]/index.ts 생성
2. GamePack 인터페이스 구현
3. src/packs/index.ts의 packs 배열에 import + 추가
→ 끝. 다른 파일 수정 없음

## 절대 하지 말 것
- 로그인/회원가입 구현
- 광고 코드 삽입
- 게임 2개 동시 개발
- 클라이언트에서 점수 계산
- 컴포넌트에서 직접 Supabase 쿼리
- 애니메이션 과하게 추가

## 현재 개발 상태
- [x] GamePack 인터페이스 정의
- [x] 점심 사기 게임팩 구현
- [x] Supabase 스키마 (migrations/001)
- [x] 홈 화면 (방 생성/참여)
- [x] 게임 메인 페이지 (라운드 오케스트레이터)
- [x] 점수 계산 API
- [ ] QR 코드 생성
- [ ] 라운드별 UI 컴포넌트 분리
- [ ] Playwright 자동 테스트

## 파일 구조
```
src/
├── types/game-pack.ts      # 핵심 인터페이스 (건드리지 마)
├── packs/
│   ├── index.ts            # 게임 레지스트리
│   └── lunch-sagi/index.ts # MVP 게임팩
├── lib/supabase.ts         # DB 접근 전담
├── app/
│   ├── page.tsx            # 홈
│   ├── room/[code]/page.tsx # 게임 메인
│   └── api/round/calculate/route.ts
```
