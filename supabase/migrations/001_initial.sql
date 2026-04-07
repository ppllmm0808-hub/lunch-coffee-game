-- ============================================================
-- 점심 사기 게임 — Supabase 스키마
-- 모든 게임팩을 수용하는 확장 가능한 구조
-- Supabase SQL Editor에 그대로 붙여넣기
-- ============================================================

-- 게임팩 메타데이터 (나중에 마켓플레이스로 확장)
create table if not exists game_packs (
  id           text primary key,   -- 'lunch-sagi', 'gaegyeong-ju'
  name         text not null,
  category     text not null,      -- 'fun', 'battle', 'psych', 'cost'
  min_players  integer default 2,
  max_players  integer default 6,
  is_premium   boolean default false,
  price_krw    integer default 0,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

-- 초기 게임팩 등록
insert into game_packs (id, name, category, min_players, max_players)
values ('lunch-sagi', '점심 사기 게임', 'cost', 2, 6)
on conflict (id) do nothing;

-- 방 테이블 (어떤 게임이든 이 테이블 하나로 처리)
create table if not exists rooms (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,
  game_pack_id  text references game_packs(id) on delete restrict,
  host_name     text not null,
  status        text default 'waiting'
                check (status in ('waiting','playing','round_end','finished')),
  current_round integer default 0,
  max_rounds    integer default 3,
  settings      jsonb default '{}',   -- 게임별 커스텀 설정 (총액 등)
  created_at    timestamptz default now(),
  expires_at    timestamptz default now() + interval '2 hours'  -- 자동 만료
);

-- 플레이어 테이블
create table if not exists players (
  id          uuid primary key default gen_random_uuid(),
  room_code   text not null references rooms(code) on delete cascade,
  nickname    text not null,
  score       integer default 0,
  is_host     boolean default false,
  joined_at   timestamptz default now()
);

-- 답변 테이블
-- value는 jsonb → 어떤 게임이든 수용
-- 점심사기 R1: {"number": 42}
-- 점심사기 R2: {"animal": "🦊"}
-- 점심사기 R3: {"ms": 2980}
-- 개경주: {"dog_id": 3}
-- 초성: {"word": "사과", "elapsed_ms": 1823}
create table if not exists answers (
  id           uuid primary key default gen_random_uuid(),
  room_code    text not null,
  round_num    integer not null,
  player_id    uuid not null references players(id) on delete cascade,
  value        jsonb not null,
  score_delta  integer default 0,
  submitted_at timestamptz default now(),
  unique(room_code, round_num, player_id)  -- 한 라운드에 답변 하나
);

-- ─────────────────────────────────────────
-- 인덱스 (트래픽 늘어나도 느려지지 않도록)
-- ─────────────────────────────────────────
create index if not exists idx_rooms_code on rooms(code);
create index if not exists idx_rooms_status on rooms(status);
create index if not exists idx_rooms_expires on rooms(expires_at);
create index if not exists idx_players_room on players(room_code);
create index if not exists idx_answers_room_round on answers(room_code, round_num);

-- ─────────────────────────────────────────
-- 점수 증가 함수 (서버에서만 실행 — 부정행위 방지)
-- ─────────────────────────────────────────
create or replace function increment_player_score(player_id uuid, delta integer)
returns void
language sql
security definer
as $$
  update players
  set score = score + delta
  where id = player_id;
$$;

-- ─────────────────────────────────────────
-- 만료된 방 자동 정리 (pg_cron 또는 Supabase Edge Scheduler)
-- ─────────────────────────────────────────
create or replace function cleanup_expired_rooms()
returns void
language sql
as $$
  delete from rooms where expires_at < now();
$$;

-- ─────────────────────────────────────────
-- Realtime 활성화 (필수)
-- Supabase Dashboard > Database > Replication에서도 켜야 함
-- ─────────────────────────────────────────
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;

-- ─────────────────────────────────────────
-- RLS (Row Level Security) — 기본 보안
-- ─────────────────────────────────────────
alter table rooms enable row level security;
alter table players enable row level security;
alter table answers enable row level security;

-- 방은 누구나 읽기 가능 (코드 알면 입장)
create policy "rooms_read" on rooms for select using (true);
create policy "rooms_insert" on rooms for insert with check (true);
create policy "rooms_update" on rooms for update using (true);

-- 플레이어는 누구나 읽기/추가 가능
create policy "players_read" on players for select using (true);
create policy "players_insert" on players for insert with check (true);
create policy "players_update" on players for update using (true);

-- 답변은 누구나 읽기/추가 (라운드 집계 필요)
create policy "answers_read" on answers for select using (true);
create policy "answers_insert" on answers for insert with check (true);
