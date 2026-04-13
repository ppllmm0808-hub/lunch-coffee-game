'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase, getRoom, getPlayers } from '@/lib/supabase'
import type { Room, Player } from '@/types/game-pack'

export function useRoom(roomCode: string) {
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  const forceRefresh = useCallback(async () => {
    const [r, p] = await Promise.all([getRoom(roomCode), getPlayers(roomCode)])
    if (r) setRoom(r)
    setPlayers(p)
  }, [roomCode])

  useEffect(() => {
    if (!roomCode) return

    async function load() {
      const [r, p] = await Promise.all([getRoom(roomCode), getPlayers(roomCode)])
      if (r) setRoom(r)
      setPlayers(p)
      setLoading(false)
    }
    load()

    const roomSub = supabase
      .channel(`room-${roomCode}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `code=eq.${roomCode}`,
      }, () => { getRoom(roomCode).then(r => { if (r) setRoom(r) }) })
      .subscribe()

    const playerSub = supabase
      .channel(`players-${roomCode}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `room_code=eq.${roomCode}`,
      }, () => { getPlayers(roomCode).then(p => setPlayers(p)) })
      .subscribe()

    return () => {
      roomSub.unsubscribe()
      playerSub.unsubscribe()
    }
  }, [roomCode])

  return { room, players, loading, forceRefresh }
}

export function useMyPlayer(roomCode: string) {
  const [myPlayer, setMyPlayer] = useState<Player | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(`player-${roomCode}`)
    if (!stored) return
    const raw = JSON.parse(stored) as Record<string, unknown>
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