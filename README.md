# 점심 사기 게임 — 셋업 가이드

## 5단계로 배포까지

### 1단계: 코드 받기 (터미널)
```bash
git clone [이 레포 주소]
cd lunch-game
npm install
```

### 2단계: Supabase 세팅 (5분)
1. supabase.com → New Project 생성
2. SQL Editor → `supabase/migrations/001_initial.sql` 내용 전체 붙여넣기 → Run
3. Settings > API → URL과 anon key 복사

```bash
cp .env.local.example .env.local
# .env.local 열어서 URL과 KEY 붙여넣기
```

### 3단계: 로컬 실행 확인
```bash
npm run dev
# http://localhost:3000 열기
# 방 만들기 → 게임 흐름 직접 테스트
```

### 4단계: GitHub 연동
```bash
git init
git add .
git commit -m "feat: MVP 첫 배포"
git remote add origin https://github.com/[아이디]/lunch-game.git
git push -u origin main
```

### 5단계: Vercel 배포 (3분)
1. vercel.com → New Project → GitHub 레포 선택
2. Environment Variables 추가:
   - `NEXT_PUBLIC_SUPABASE_URL` = [Supabase URL]
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = [Supabase anon key]
3. Deploy 클릭
4. **완료** → `https://lunch-game.vercel.app` 생성됨

이후 `git push origin main` 할 때마다 자동 재배포.

---

## 새 게임 추가하는 법

```bash
# 1. 게임팩 파일 생성
cp -r src/packs/lunch-sagi src/packs/[새게임]
# index.ts 수정해서 새 게임 로직 구현

# 2. 레지스트리에 등록 (한 줄)
# src/packs/index.ts에서 packs 배열에 추가

# 3. DB에 게임팩 등록
# Supabase SQL Editor:
# INSERT INTO game_packs (id, name, category) VALUES ('새게임', '게임이름', 'fun');
```

---

## 자동 테스트 실행

```bash
npx playwright install  # 최초 1회
npm run dev             # 서버 켜둔 채로
npx playwright test     # 새 터미널에서
```

---

## 파일 구조

```
src/
├── types/
│   └── game-pack.ts          # 핵심 인터페이스 (절대 수정 금지)
├── packs/
│   ├── index.ts              # 게임 레지스트리
│   └── lunch-sagi/index.ts   # MVP 게임팩
├── lib/
│   └── supabase.ts           # DB 접근 전담
├── app/
│   ├── page.tsx              # 홈
│   ├── room/[code]/page.tsx  # 게임 메인
│   └── api/
│       └── round/calculate/route.ts  # 점수 계산 API
supabase/
└── migrations/001_initial.sql  # DB 스키마
tests/
└── game-flow.spec.ts           # 자동 테스트
CLAUDE.md                       # Claude Code 메모리
```
