import { createClient } from '@supabase/supabase-js'
import type { Room, Player } from '@/types/game-pack'

// DB row 타입 (Supabase에서 오는 snake_case)
export interface DbRoom {
  id: string
  code: string
  game_pack_id: string
  host_name: string
  total_amount: number
  status: string
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// ── DB → App 타입 변환 (snake_case → camelCase) ──────────────

function mapRoom(r: DbRoom): Room {
  return {
    id: r.id,
    code: r.code,
    gamePackId: r.game_pack_id,
    hostName: r.host_name,
    status: r.status as Room['status'],
    currentRound: r.current_round,
    maxRounds: r.max_rounds,
    settings: { ...r.settings, totalAmount: r.total_amount },
    createdAt: r.created_at,
  }
}

function mapPlayer(p: DbPlayer): Player {
  return {
    id: p.id,
    roomCode: p.room_code,
    nickname: p.nickname,
    score: p.score,
    isHost: p.is_host,
    joinedAt: p.joined_at,
  }
}

// ── DB 헬퍼 함수 (모든 컴포넌트는 여기만 호출) ──────────────

export async function getRoom(code: string): Promise<Room | null> {
  const { data } = await supabase.from('rooms').select('*').eq('code', code).single()
  return data ? mapRoom(data) : null
}

export async function getPlayers(roomCode: string): Promise<Player[]> {
  const { data } = await supabase.from('players').select('*').eq('room_code', roomCode)
  return (data ?? []).map(mapPlayer)
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
  const { data } = await supabase.from('players').select('score').eq('id', playerId).single()
  const current = data?.score ?? 0
  return supabase.from('players').update({ score: current + delta }).eq('id', playerId)
}

export async function updateRoomStatus(
  roomCode: string,
  status: Room['status'],
  currentRound?: number
) {
  const update: Record<string, unknown> = { status }
  if (currentRound !== undefined) update.current_round = currentRound
  return supabase.from('rooms').update(update).eq('code', roomCode)
}

// 방장이 다음 라운드 게임 선택 후 호출
export async function selectNextGame(
  roomCode: string,
  nextRound: number,
  gameType: string
) {
  const { data } = await supabase.from('rooms').select('settings').eq('code', roomCode).single()
  const settings = { ...(data?.settings ?? {}), currentGameType: gameType }
  return supabase.from('rooms').update({
    status: 'playing',
    current_round: nextRound,
    settings,
  }).eq('code', roomCode)
}

// 마지막 라운드 종료 후 방장이 최종 결과로 넘길 때 호출
export async function finishGame(roomCode: string) {
  return supabase.from('rooms').update({ status: 'finished' }).eq('code', roomCode)
}

// 방장이 다음 라운드 게임 선택 (레디 단계로 — 아직 playing 아님)
export async function selectGameForNextRound(
  roomCode: string,
  nextRound: number,
  gameType: string
) {
  const { data } = await supabase.from('rooms').select('settings').eq('code', roomCode).single()
  const settings = { ...(data?.settings ?? {}), nextGameType: gameType, nextRound, readyPlayers: [] }
  return supabase.from('rooms').update({ settings }).eq('code', roomCode)
}

// 플레이어 레디 (중복 방지)
export async function markPlayerReady(roomCode: string, playerId: string) {
  const { data } = await supabase.from('rooms').select('settings').eq('code', roomCode).single()
  const settings = data?.settings ?? {}
  const prev = (settings.readyPlayers as string[] | undefined) ?? []
  if (prev.includes(playerId)) return
  const readyPlayers = [...prev, playerId]
  return supabase.from('rooms').update({ settings: { ...settings, readyPlayers } }).eq('code', roomCode)
}

// 방장이 스타트 (모두 레디 확인 후)
export async function startNextRound(roomCode: string) {
  const { data } = await supabase.from('rooms').select('settings').eq('code', roomCode).single()
  const settings = data?.settings ?? {}
  const nextRound = settings.nextRound as number
  const nextGameType = settings.nextGameType as string
  const newSettings = { ...settings, currentGameType: nextGameType, readyPlayers: [] }
  return supabase.from('rooms').update({
    status: 'playing',
    current_round: nextRound,
    settings: newSettings,
  }).eq('code', roomCode)
}

// ── Realtime 구독 ──────────────────────────────────────────

export function subscribeToRoom(roomCode: string, onUpdate: (room: Room) => void) {
  return supabase
    .channel(`room:${roomCode}`)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${roomCode}`,
    }, (payload: { new: DbRoom }) => onUpdate(mapRoom(payload.new)))
    .subscribe()
}

export function subscribeToPlayers(roomCode: string, onUpdate: (players: Player[]) => void) {
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
