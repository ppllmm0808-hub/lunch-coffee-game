import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { roomCode, sec } = await req.json()

  const { data } = await supabase
    .from('rooms').select('settings').eq('code', roomCode).single()

  const settings = { ...(data?.settings ?? {}), moleTargetSec: sec }

  await supabase.from('rooms').update({ settings }).eq('code', roomCode)

  return NextResponse.json({ ok: true })
}