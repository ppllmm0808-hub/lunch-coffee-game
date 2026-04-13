import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getGamePack } from '@/packs'
import type { Answer } from '@/types/game-pack'

export async function POST(req: NextRequest) {
  const { roomCode, playerId, value } = await req.json()

  const { data: room } = await supabase
    .from('rooms').select('*').eq('code', roomCode).single()

  if (!room) return NextResponse.json({ error: '방 없음' }, { status: 404 })

  const round = room.current_round

  await supabase.from('answers').insert({
    room_code: roomCode,
    round_num: round,
    player_id: playerId,
    value,
  })

  const { data: answers } = await supabase
    .from('answers').select('*').eq('room_code', roomCode).eq('round_num', round)

  const { data: players } = await supabase
    .from('players').select('*').eq('room_code', roomCode)

  if (answers && players && answers.length >= players.length) {
    const pack = getGamePack(room.game_pack_id)

    type AnyRow = Record<string, unknown>
    const mappedAnswers: Answer[] = (answers as AnyRow[]).map(a => ({
      playerId: a.player_id as string,
      roomCode: a.room_code as string,
      roundNum: a.round_num as number,
      value: a.value,
      submittedAt: a.submitted_at as string,
    }))

    const roundScores = pack.calculateRoundScore(mappedAnswers, round)

    await Promise.all(
      roundScores.map(async ({ playerId: pid, scoreDelta }) => {
        await supabase
          .from('answers').update({ score_delta: scoreDelta })
          .eq('room_code', roomCode).eq('round_num', round).eq('player_id', pid)

        const player = (players as AnyRow[]).find(p => p.id === pid)
        if (player) {
          await supabase
            .from('players').update({ score: (player.score as number) + scoreDelta }).eq('id', pid)
        }
      })
    )

    // 라운드 결과를 settings.roundHistory에 저장
    const roundConfig = pack.getRoundConfig(round, room.settings ?? {})
    const prevHistory = (room.settings?.roundHistory as unknown[] | undefined) ?? []
    const newHistory = [
      ...prevHistory,
      {
        title: roundConfig.title,
        results: roundScores.map(r => ({
          playerId: r.playerId,
          detail: r.detail,
        }))
      }
    ]

    await supabase.from('rooms').update({
      settings: { ...room.settings, roundHistory: newHistory }
    }).eq('code', roomCode)

    const isLastRound = round >= room.max_rounds

    if (isLastRound) {
  await supabase.from('rooms').update({ status: 'finished' }).eq('code', roomCode)
} else {
  await supabase.from('rooms').update({
    status: 'playing',
    current_round: round + 1,
  }).eq('code', roomCode)
}


    return NextResponse.json({ allSubmitted: true, roundScores, isLastRound })
  }

  return NextResponse.json({ allSubmitted: false })
}