-- 영업 일지 시스템 스키마
-- profiles: 사용자 역할 관리
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  name text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz default now()
);

-- sales_logs: 일별 일지 헤더
create table if not exists public.sales_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  log_date date not null default current_date,
  summary text,
  weather text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, log_date)
);

-- activities: 개별 활동 기록
create table if not exists public.activities (
  id uuid default gen_random_uuid() primary key,
  log_id uuid references public.sales_logs(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  activity_time time not null,
  activity_type text not null,
  company text,
  contact text,
  content text,
  result text,
  lat double precision,
  lng double precision,
  created_at timestamptz default now()
);

-- RLS 활성화
alter table public.profiles enable row level security;
alter table public.sales_logs enable row level security;
alter table public.activities enable row level security;

-- profiles 정책
create policy "본인 프로필 조회" on public.profiles
  for select using (auth.uid() = id);

create policy "본인 프로필 수정" on public.profiles
  for update using (auth.uid() = id);

create policy "관리자 전체 조회" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- sales_logs 정책
create policy "본인 일지 조회" on public.sales_logs
  for select using (auth.uid() = user_id);

create policy "본인 일지 작성" on public.sales_logs
  for insert with check (auth.uid() = user_id);

create policy "본인 일지 수정" on public.sales_logs
  for update using (auth.uid() = user_id);

create policy "관리자 전체 일지 조회" on public.sales_logs
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- activities 정책
create policy "본인 활동 조회" on public.activities
  for select using (auth.uid() = user_id);

create policy "본인 활동 작성" on public.activities
  for insert with check (auth.uid() = user_id);

create policy "본인 활동 수정" on public.activities
  for update using (auth.uid() = user_id);

create policy "본인 활동 삭제" on public.activities
  for delete using (auth.uid() = user_id);

create policy "관리자 전체 활동 조회" on public.activities
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 회원가입 시 자동 프로필 생성
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
