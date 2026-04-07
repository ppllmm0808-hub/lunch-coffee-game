import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateRoomCode } from '@/lib/supabase'
import { getGamePack } from '@/packs'

const FREE_PLAN_MONTHLY_LIMIT = 3  // 나중에 결제 붙일 때 실제로 활성화

async function getOrCreateUser(deviceId: string) {
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('device_id', deviceId)
    .single()
  if (existing) return existing

  const { data: created } = await supabase
    .from('users')
    .insert({ device_id: deviceId })
    .select()
    .single()
  return created
}

async function checkPlanLimit(_deviceId: string): Promise<{ allowed: boolean; reason?: string }> {
  // TODO: 결제 기능 붙일 때 아래 주석 해제
  // const user = await getOrCreateUser(deviceId)
  // if (user.plan === 'free' && user.rooms_created_this_month >= FREE_PLAN_MONTHLY_LIMIT) {
  //   return { allowed: false, reason: `무료 플랜은 월 ${FREE_PLAN_MONTHLY_LIMIT}회까지 방을 만들 수 있어요.` }
  // }
  void FREE_PLAN_MONTHLY_LIMIT  // 미사용 경고 방지
  return { allowed: true }
}

export async function POST(req: NextRequest) {
  const { gamePackId, hostName, totalAmount, maxRounds, deviceId, settings } = await req.json()

  // 플랜 제한 확인 (현재는 항상 통과)
  if (deviceId) {
    const { allowed, reason } = await checkPlanLimit(deviceId)
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 })
    }
  }

  // 게임팩 존재 확인
  let pack
  try {
    pack = getGamePack(gamePackId)
  } catch {
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
      max_rounds: maxRounds ?? pack.meta.roundCount,
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

  // device_id 있으면 방 생성 횟수 증가 (현재는 DB만 기록, 제한은 미적용)
  if (deviceId) {
    const user = await getOrCreateUser(deviceId)
    if (user) {
      await supabase
        .from('users')
        .update({ rooms_created_this_month: user.rooms_created_this_month + 1 })
        .eq('device_id', deviceId)
    }
  }

  return NextResponse.json({ room, player })
}
