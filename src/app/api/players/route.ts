import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { roomCode, nickname } = await req.json()

  const { data: room } = await supabase
    .from('rooms').select('*').eq('code', roomCode).single()

  if (!room)                     return NextResponse.json({ error: '방을 찾을 수 없어요' }, { status: 404 })
  if (room.status !== 'waiting') return NextResponse.json({ error: '이미 시작된 게임이에요' }, { status: 400 })

  const { data: existing } = await supabase
    .from('players').select('id').eq('room_code', roomCode)
  if (existing && existing.length >= 6)
    return NextResponse.json({ error: '방이 꽉 찼어요 (최대 6명)' }, { status: 400 })

  const { data: player, error } = await supabase
    .from('players')
    .insert({ room_code: roomCode, nickname, is_host: false })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ player })
}
