-- ============================================================
-- Supabase SQL 스키마
-- Supabase 대시보드 → SQL Editor에 전체 붙여넣기 후 실행
-- ============================================================

-- 게임팩 메타데이터 (나중에 마켓플레이스로 확장)
create table if not exists game_packs (
  id          text primary key,
  name        text not null,
  category    text not null check (category in ('fun','battle','psych','cost')),
  min_players integer default 2,
  max_players integer default 6,
  is_premium  boolean default false,
  price_krw   integer default 0,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- 초기 게임팩 등록
insert into game_packs (id, name, category) values
  ('lunch-sagi', '점심 사기 게임', 'cost')
on conflict (id) do nothing;

-- 방 테이블 (어떤 게임이든 이 테이블 하나)
create table if not exists rooms (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,
  game_pack_id  text references game_packs(id),
  host_name     text not null,
  total_amount  integer default 35000,
  status        text default 'waiting' check (status in ('waiting','playing','round_end','finished')),
  current_round integer default 0,
  max_rounds    integer default 3,
  settings      jsonb default '{}',   -- 게임별 커스텀 설정
  created_at    timestamptz default now()
);

-- 플레이어 테이블
create table if not exists players (
  id        uuid primary key default gen_random_uuid(),
  room_code text not null references rooms(code) on delete cascade,
  nickname  text not null,
  score     integer default 0,
  is_host   boolean default false,
  joined_at timestamptz default now()
);

-- 답변 테이블
-- value 컬럼이 jsonb → 게임마다 다른 형태 수용
-- 점심사기: {"number": 42}
-- 개경주:   {"dog_id": 3}
-- 초성:     {"answer": "사과", "time_ms": 1823}
create table if not exists answers (
  id           uuid primary key default gen_random_uuid(),
  room_code    text not null,
  round_num    integer not null,
  player_id    uuid not null references players(id) on delete cascade,
  value        jsonb not null,
  score_delta  integer default 0,
  submitted_at timestamptz default now()
);

-- 인덱스 (트래픽 많아져도 느려지지 않게)
create index if not exists idx_rooms_code         on rooms(code);
create index if not exists idx_players_room_code  on players(room_code);
create index if not exists idx_answers_room_round on answers(room_code, round_num);
create index if not exists idx_answers_player     on answers(player_id);

-- ============================================================
-- Row Level Security (RLS) — 기본 보안
-- ============================================================
alter table rooms   enable row level security;
alter table players enable row level security;
alter table answers enable row level security;

-- 모든 사용자가 읽기 가능 (익명 게임이므로)
create policy "rooms_read"   on rooms   for select using (true);
create policy "players_read" on players for select using (true);
create policy "answers_read" on answers for select using (true);

-- 삽입/수정은 anon key로 가능 (서버 API에서 처리)
create policy "rooms_insert"   on rooms   for insert with check (true);
create policy "players_insert" on players for insert with check (true);
create policy "answers_insert" on answers for insert with check (true);
create policy "rooms_update"   on rooms   for update using (true);
create policy "players_update" on players for update using (true);

-- ============================================================
-- Realtime 활성화 (대시보드 Table Editor > Realtime 토글도 켜야 함)
-- ============================================================
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table answers;

-- ============================================================
-- 오래된 방 자동 정리 (7일 지난 방 삭제)
-- Supabase Dashboard → Database → Extensions → pg_cron 활성화 필요
-- ============================================================
-- select cron.schedule('cleanup-old-rooms', '0 3 * * *',
--   $$ delete from rooms where created_at < now() - interval '7 days' $$
-- );
