import { createClient } from '@supabase/supabase-js'

export type RoomStatus = 'waiting' | 'playing' | 'finished'

export interface DbRoom {
  id: string
  code: string
  game_pack_id: string
  host_name: string
  total_amount: number
  status: RoomStatus
  current_round: number
  max_rounds: number
  settings: Record<string, unknown>
  created_at: string
}

export interface DbPlayer {
  id: string
  room_code: string
  nickname: string
  score: number
  is_host: boolean
  joined_at: string
}

export interface DbAnswer {
  id: string
  room_code: string
  round_num: number
  player_id: string
  value: Record<string, unknown>  // jsonb — 게임마다 자유
  score_delta: number
  submitted_at: string
}

export type Database = {
  public: {
    Tables: {
      rooms:   { Row: DbRoom;   Insert: Omit<DbRoom,   'id'|'created_at'>; Update: Partial<DbRoom> }
      players: { Row: DbPlayer; Insert: Omit<DbPlayer, 'id'|'joined_at'>;  Update: Partial<DbPlayer> }
      answers: { Row: DbAnswer; Insert: Omit<DbAnswer, 'id'|'submitted_at'>; Update: Partial<DbAnswer> }
    }
  }
}

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// ── DB 헬퍼 함수 (모든 컴포넌트는 여기만 호출) ──────────────

export async function getRoom(code: string): Promise<DbRoom | null> {
  const { data } = await supabase.from('rooms').select('*').eq('code', code).single()
  return data
}

export async function getPlayers(roomCode: string): Promise<DbPlayer[]> {
  const { data } = await supabase.from('players').select('*').eq('room_code', roomCode)
  return data ?? []
}

export async function getAnswers(roomCode: string, roundNum: number): Promise<DbAnswer[]> {
  const { data } = await supabase
    .from('answers').select('*').eq('room_code', roomCode).eq('round_num', roundNum)
  return data ?? []
}

export async function submitAnswer(params: {
  roomCode: string; roundNum: number; playerId: string; value: unknown
}) {
  return supabase.from('answers').insert({
    room_code: params.roomCode,
    round_num: params.roundNum,
    player_id: params.playerId,
    value: params.value as Record<string, unknown>,
  })
}

export async function updatePlayerScore(playerId: string, delta: number) {
  // 현재 점수 먼저 가져와서 누적
  const { data } = await supabase.from('players').select('score').eq('id', playerId).single()
  const current = data?.score ?? 0
  return supabase.from('players').update({ score: current + delta }).eq('id', playerId)
}

export async function updateRoomStatus(
  roomCode: string,
  status: RoomStatus | 'round_end',
  currentRound?: number
) {
  const update: Record<string, unknown> = { status }
  if (currentRound !== undefined) update.current_round = currentRound
  return supabase.from('rooms').update(update).eq('code', roomCode)
}

// ── Realtime 구독 ──────────────────────────────────────────

export function subscribeToRoom(roomCode: string, onUpdate: (room: DbRoom) => void) {
  return supabase
    .channel(`room:${roomCode}`)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${roomCode}`,
    }, (payload) => onUpdate(payload.new as DbRoom))
    .subscribe()
}

export function subscribeToPlayers(roomCode: string, onUpdate: (players: DbPlayer[]) => void) {
  return supabase
    .channel(`players:${roomCode}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'players', filter: `room_code=eq.${roomCode}`,
    }, async () => {
      const players = await getPlayers(roomCode)
      onUpdate(players)
    })
    .subscribe()
}

export function subscribeToAnswers(
  roomCode: string, roundNum: number, onUpdate: (answers: DbAnswer[]) => void
) {
  return supabase
    .channel(`answers:${roomCode}:${roundNum}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'answers',
      filter: `room_code=eq.${roomCode}`,
    }, async () => {
      const answers = await getAnswers(roomCode, roundNum)
      onUpdate(answers)
    })
    .subscribe()
}
