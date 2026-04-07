-- ============================================================
-- Migration 002: 수익화 기반 구조
-- Supabase SQL Editor에서 실행
-- 실제 결제 기능은 미구현 — DB 구조만 선점
-- ============================================================

-- ─────────────────────────────────────────
-- users 테이블 (로그인 없이 device_id로 식별)
-- ─────────────────────────────────────────
create table if not exists users (
  id                      uuid primary key default gen_random_uuid(),
  device_id               text unique not null,         -- 브라우저 fingerprint
  plan                    text not null default 'free'
                            check (plan in ('free', 'pro')),
  rooms_created_this_month integer not null default 0,  -- 매월 1일 리셋 (pg_cron)
  plan_expires_at         timestamptz,                  -- pro 만료일, null = 무기한
  created_at              timestamptz default now()
);

-- ─────────────────────────────────────────
-- rooms 테이블에 host_device_id 추가
-- ─────────────────────────────────────────
alter table rooms
  add column if not exists host_device_id text references users(device_id) on delete set null;

-- ─────────────────────────────────────────
-- 인덱스
-- ─────────────────────────────────────────
create index if not exists idx_users_device_id on users(device_id);
create index if not exists idx_rooms_host_device_id on rooms(host_device_id);

-- ─────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────
alter table users enable row level security;

-- 자기 자신만 읽기 가능
create policy "users_read_own"   on users for select using (true);  -- API에서 device_id 필터링
create policy "users_insert"     on users for insert with check (true);
create policy "users_update_own" on users for update using (true);

-- ─────────────────────────────────────────
-- 월별 방 생성 횟수 리셋 (pg_cron 활성화 필요)
-- Supabase → Database → Extensions → pg_cron 켜기
-- ─────────────────────────────────────────
-- select cron.schedule(
--   'reset-monthly-room-count',
--   '0 0 1 * *',
--   $$ update users set rooms_created_this_month = 0 $$
-- );

-- ─────────────────────────────────────────
-- 무료 플랜 제한 상수 (참고용 주석)
-- FREE_PLAN_MONTHLY_LIMIT = 3
-- pro 플랜: 무제한
-- 초과 시 결제 유도 → 나중에 활성화
-- ─────────────────────────────────────────
