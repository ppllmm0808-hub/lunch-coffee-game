import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateRoomCode } from '@/lib/supabase'
import { GamePackRegistry } from '@/lib/game-pack.registry'

export async function POST(req: NextRequest) {
  const { gamePackId, hostName, totalAmount, settings } = await req.json()

  // 게임팩 존재 확인
  const pack = GamePackRegistry.get(gamePackId)
  if (!pack) {
    return NextResponse.json({ error: '존재하지 않는 게임팩' }, { status: 400 })
  }

  // 6자리 코드 생성 (충돌 시 재시도)
  let code = generateRoomCode()
  let attempts = 0
  while (attempts < 5) {
    const { data } = await supabase.from('rooms').select('code').eq('code', code).single()
    if (!data) break
    code = generateRoomCode()
    attempts++
  }

  // 방 생성
  const { data: room, error } = await supabase
    .from('rooms')
    .insert({
      code,
      game_pack_id: gamePackId,
      host_name: hostName,
      total_amount: totalAmount ?? 35000,
      max_rounds: pack.meta.roundCount,
      settings: settings ?? {},
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 방장을 플레이어로 등록
  const { data: player } = await supabase
    .from('players')
    .insert({ room_code: code, nickname: hostName, is_host: true })
    .select()
    .single()

  return NextResponse.json({ room, player })
}
