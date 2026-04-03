import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { GamePackRegistry } from '@/lib/game-pack.registry'

// 답변 제출 + 전원 제출 시 점수 계산
export async function POST(req: NextRequest) {
  const { roomCode, playerId, value } = await req.json()

  // 방 정보 조회
  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', roomCode)
    .single()

  if (!room) return NextResponse.json({ error: '방 없음' }, { status: 404 })

  const round = room.current_round

  // 답변 저장
  await supabase.from('answers').insert({
    room_code: roomCode,
    round_num: round,
    player_id: playerId,
    value,
  })

  // 이번 라운드에 몇 명이 답변했는지 확인
  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('room_code', roomCode)
    .eq('round_num', round)

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('room_code', roomCode)

  // 전원 제출 완료 → 점수 계산
  if (answers && players && answers.length >= players.length) {
    const pack = GamePackRegistry.getOrThrow(room.game_pack_id)

    const roundScores = pack.calculateRoundScore(
      answers.map(a => ({
        playerId: a.player_id,
        value: a.value as Record<string, unknown>,
        submittedAt: new Date(a.submitted_at).getTime(),
      })),
      round
    )

    // 각 플레이어 점수 업데이트 + answer에 score_delta 기록
    await Promise.all(
      roundScores.map(async ({ playerId: pid, delta }) => {
        // answers 테이블에 점수 기록
        await supabase
          .from('answers')
          .update({ score_delta: delta })
          .eq('room_code', roomCode)
          .eq('round_num', round)
          .eq('player_id', pid)

        // players 테이블 누적 점수 업데이트
        const player = players.find(p => p.id === pid)
        if (player) {
          await supabase
            .from('players')
            .update({ score: player.score + delta })
            .eq('id', pid)
        }
      })
    )

    // 라운드 진행 or 게임 종료
    const isLastRound = round >= room.max_rounds
    await supabase
      .from('rooms')
      .update({
        current_round: isLastRound ? round : round + 1,
        status: isLastRound ? 'finished' : 'playing',
      })
      .eq('code', roomCode)

    return NextResponse.json({ allSubmitted: true, roundScores, isLastRound })
  }

  return NextResponse.json({ allSubmitted: false })
}
