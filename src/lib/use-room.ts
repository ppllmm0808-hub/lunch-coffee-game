'use client'
import { useEffect, useState } from 'react'
import { supabase, DbRoom, DbPlayer } from '@/lib/supabase'

// 모든 게임에서 공통으로 쓰는 Realtime 훅
// 방 상태, 플레이어 목록 실시간 동기화
export function useRoom(roomCode: string) {
  const [room, setRoom] = useState<DbRoom | null>(null)
  const [players, setPlayers] = useState<DbPlayer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roomCode) return

    // 초기 데이터 로드
    async function load() {
      const [{ data: r }, { data: p }] = await Promise.all([
        supabase.from('rooms').select('*').eq('code', roomCode).single(),
        supabase.from('players').select('*').eq('room_code', roomCode),
      ])
      if (r) setRoom(r)
      if (p) setPlayers(p)
      setLoading(false)
    }
    load()

    // Realtime 구독 — 방 상태 변경 감지
    const roomSub = supabase
      .channel(`room-${roomCode}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `code=eq.${roomCode}`,
      }, payload => setRoom(payload.new as DbRoom))
      .subscribe()

    // Realtime 구독 — 플레이어 입장/변경 감지
    const playerSub = supabase
      .channel(`players-${roomCode}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `room_code=eq.${roomCode}`,
      }, () => {
        supabase.from('players').select('*').eq('room_code', roomCode)
          .then(({ data }) => { if (data) setPlayers(data) })
      })
      .subscribe()

    return () => {
      roomSub.unsubscribe()
      playerSub.unsubscribe()
    }
  }, [roomCode])

  return { room, players, loading }
}

// 내 플레이어 세션 관리 (localStorage 기반)
export function useMyPlayer(roomCode: string) {
  const [myPlayer, setMyPlayer] = useState<DbPlayer | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(`player-${roomCode}`)
    if (stored) setMyPlayer(JSON.parse(stored))
  }, [roomCode])

  const savePlayer = (player: DbPlayer) => {
    setMyPlayer(player)
    localStorage.setItem(`player-${roomCode}`, JSON.stringify(player))
  }

  return { myPlayer, savePlayer }
}
