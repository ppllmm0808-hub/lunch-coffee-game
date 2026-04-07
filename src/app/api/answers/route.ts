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

    const isLastRound = round >= room.max_rounds
    // 항상 round_end로 전환 — 방장이 다음 게임 선택 또는 최종 결과 버튼을 눌러야 다음 단계로 진행
    await supabase.from('rooms').update({ status: 'round_end' }).eq('code', roomCode)

    return NextResponse.json({ allSubmitted: true, roundScores, isLastRound })
  }

  return NextResponse.json({ allSubmitted: false })
}
