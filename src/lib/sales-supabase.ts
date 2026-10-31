import { createClient } from '@supabase/supabase-js'

export const salesSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface Profile {
  id: string
  email: string
  name: string | null
  role: 'member' | 'admin'
  created_at: string
}

export interface SalesLog {
  id: string
  user_id: string
  log_date: string
  summary: string | null
  weather: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface Activity {
  id: string
  log_id: string
  user_id: string
  activity_time: string
  activity_type: string
  company: string | null
  contact: string | null
  content: string | null
  result: string | null
  lat: number | null
  lng: number | null
  created_at: string
}

export async function getOrCreateLog(userId: string, date: string): Promise<SalesLog | null> {
  const { data: existing } = await salesSupabase
    .from('sales_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', date)
    .single()

  if (existing) return existing

  const { data } = await salesSupabase
    .from('sales_logs')
    .insert({ user_id: userId, log_date: date })
    .select()
    .single()

  return data
}

export async function getActivities(logId: string): Promise<Activity[]> {
  const { data } = await salesSupabase
    .from('activities')
    .select('*')
    .eq('log_id', logId)
    .order('activity_time')

  return data ?? []
}

export async function saveActivity(activity: Omit<Activity, 'id' | 'created_at'>): Promise<Activity | null> {
  const { data } = await salesSupabase
    .from('activities')
    .insert(activity)
    .select()
    .single()

  return data
}

export async function updateActivity(id: string, updates: Partial<Activity>): Promise<void> {
  await salesSupabase.from('activities').update(updates).eq('id', id)
}

export async function deleteActivity(id: string): Promise<void> {
  await salesSupabase.from('activities').delete().eq('id', id)
}

export async function updateLogSummary(logId: string, summary: string): Promise<void> {
  await salesSupabase
    .from('sales_logs')
    .update({ summary, updated_at: new Date().toISOString() })
    .eq('id', logId)
}

// 관리자용: 전체 팀원 일지 조회
export async function getAllLogsForDate(date: string): Promise<SalesLog[]> {
  const { data } = await salesSupabase
    .from('sales_logs')
    .select('*, profiles(name, email, role)')
    .eq('log_date', date)

  return data ?? []
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await salesSupabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return data
}
