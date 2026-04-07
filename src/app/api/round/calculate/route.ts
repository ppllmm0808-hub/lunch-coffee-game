// ============================================================
// 점수 계산 API Route — 서버에서만 실행
// 클라이언트에서 직접 계산하면 부정행위 가능 → 반드시 서버에서
//
// POST /api/round/calculate
// Body: { roomCode, roundNum }
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getGamePack } from '@/packs'
import { getRoom, getPlayers, getAnswers, updatePlayerScore, updateRoomStatus } from '@/lib/supabase'
import type { Answer } from '@/types/game-pack'

export async function POST(req: NextRequest) {
  try {
    const { roomCode, roundNum } = await req.json()

    if (!roomCode || !roundNum) {
      return NextResponse.json({ error: 'roomCode, roundNum 필요' }, { status: 400 })
    }

    // 1. 방, 플레이어, 답변 조회
    const [room, players, rawAnswers] = await Promise.all([
      getRoom(roomCode),
      getPlayers(roomCode),
      getAnswers(roomCode, roundNum),
    ])

    if (!room) {
      return NextResponse.json({ error: '방을 찾을 수 없음' }, { status: 404 })
    }

    // 2. GamePack으로 점수 계산 (게임별 로직)
    const pack = getGamePack(room.gamePackId)
    const answers: Answer[] = rawAnswers.map((a) => ({
      playerId: a.player_id,
      roomCode: a.room_code,
      roundNum: a.round_num,
      value: a.value,
      submittedAt: a.submitted_at,
    }))

    const results = pack.calculateRoundScore(answers, roundNum)

    // 3. 점수 업데이트 (병렬)
    await Promise.all(
      results.map((r) => updatePlayerScore(r.playerId, r.scoreDelta))
    )

    // 4. 방 상태를 라운드 종료로 변경
    await updateRoomStatus(roomCode, 'round_end')

    return NextResponse.json({
      success: true,
      results,
      roundNum,
    })
  } catch (err) {
    console.error('점수 계산 오류:', err)
    return NextResponse.json({ error: '점수 계산 실패' }, { status: 500 })
  }
}
