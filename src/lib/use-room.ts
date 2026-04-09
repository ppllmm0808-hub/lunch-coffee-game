'use client'
import { useEffect, useState } from 'react'
import { supabase, getRoom, getPlayers } from '@/lib/supabase'
import type { Room, Player } from '@/types/game-pack'

// 모든 게임에서 공통으로 쓰는 Realtime 훅
// 방 상태, 플레이어 목록 실시간 동기화
export function useRoom(roomCode: string) {
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  async function forceRefresh() {
    const [r, p] = await Promise.all([getRoom(roomCode), getPlayers(roomCode)])
    if (r) setRoom(r)
    setPlayers(p)
  }

  useEffect(() => {
    if (!roomCode) return

    async function load() {
      const [r, p] = await Promise.all([getRoom(roomCode), getPlayers(roomCode)])
      if (r) setRoom(r)
      setPlayers(p)
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
      }, () => { getRoom(roomCode).then(r => { if (r) setRoom(r) }) })
      .subscribe()

    // Realtime 구독 — 플레이어 입장/변경 감지
    const playerSub = supabase
      .channel(`players-${roomCode}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `room_code=eq.${roomCode}`,
      }, () => { getPlayers(roomCode).then(p => setPlayers(p)) })
      .subscribe()

    // 폴링 — Realtime이 느리거나 안 올 때 모든 상태 전환 보장
    const poll = setInterval(async () => {
      const [r, p] = await Promise.all([getRoom(roomCode), getPlayers(roomCode)])
      if (r) setRoom(r)
      setPlayers(p)
    }, 3000)

    return () => {
      roomSub.unsubscribe()
      playerSub.unsubscribe()
      clearInterval(poll)
    }
  }, [roomCode])

  return { room, players, loading, forceRefresh }
}

// 내 플레이어 세션 관리 (localStorage 기반)
// API 응답이 snake_case(DbPlayer)로 저장되어 있어도 camelCase(Player)로 변환해서 반환
export function useMyPlayer(roomCode: string) {
  const [myPlayer, setMyPlayer] = useState<Player | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(`player-${roomCode}`)
    if (!stored) return
    const raw = JSON.parse(stored) as Record<string, unknown>
    // API에서 snake_case로 저장됐을 수도 있고, camelCase일 수도 있음
    const player: Player = {
      id: raw.id as string,
      roomCode: (raw.room_code ?? raw.roomCode) as string,
      nickname: raw.nickname as string,
      score: (raw.score as number) ?? 0,
      isHost: (raw.is_host ?? raw.isHost) as boolean,
      joinedAt: (raw.joined_at ?? raw.joinedAt ?? '') as string,
    }
    setMyPlayer(player)
  }, [roomCode])

  return { myPlayer }
}
