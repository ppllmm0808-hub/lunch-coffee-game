'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRoom } from '@/lib/use-room'
import { GamePackRegistry } from '@/lib/game-pack.registry'
import { DbPlayer } from '@/lib/supabase'

const RANK_EMOJI = ['🥇','🥈','🥉','4️⃣','5️⃣','💀']

export default function ResultPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const router = useRouter()
  const { room, players } = useRoom(code)
  const [finalResult, setFinalResult] = useState<ReturnType<typeof calcResult> | null>(null)

  function calcResult() {
    if (!room || !players.length) return null
    const pack = GamePackRegistry.getOrThrow(room.game_pack_id)
    const scores: Record<string, number> = {}
    players.forEach(p => { scores[p.id] = p.score })
    return pack.calculateFinalResult(scores, players, room.total_amount)
  }

  useEffect(() => {
    if (room?.status === 'finished' && players.length > 0) {
      setFinalResult(calcResult())
    }
  }, [room?.status, players.length])

  if (!finalResult) return (
    <div style={{ padding:'2rem', textAlign:'center', color:'var(--color-text-tertiary)' }}>결과 계산 중...</div>
  )

  return (
    <main style={{ maxWidth:400, margin:'0 auto', padding:'1.5rem 1rem', fontFamily:'var(--font-sans)' }}>
      <div style={{ textAlign:'center', marginBottom:24 }}>
        <div style={{ fontSize:40, marginBottom:8 }}>🏆</div>
        <h2 style={{ fontSize:20, fontWeight:500, margin:0 }}>최종 결과</h2>
        <p style={{ fontSize:13, color:'var(--color-text-tertiary)', marginTop:4 }}>오늘의 점심 분담</p>
      </div>

      {/* 순위별 카드 */}
      {finalResult.rankings.map((r, i) => (
        <div key={r.playerId} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderRadius:10, border:'0.5px solid var(--color-border-tertiary)', background:'var(--color-background-primary)', marginBottom:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:20 }}>{RANK_EMOJI[i] ?? '💀'}</span>
            <span style={{ fontSize:15, fontWeight:500 }}>{r.nickname}</span>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:17, fontWeight:500 }}>{r.amountKrw.toLocaleString()}원</div>
            <div style={{ fontSize:12, color:'var(--color-text-tertiary)' }}>{Math.round(r.shareRatio*100)}%</div>
          </div>
        </div>
      ))}

      {/* 총액 */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderRadius:10, background:'var(--color-background-secondary)', marginTop:4, marginBottom:24 }}>
        <span style={{ fontSize:14, fontWeight:500 }}>총 점심 금액</span>
        <span style={{ fontSize:16, fontWeight:500 }}>{room?.total_amount.toLocaleString()}원</span>
      </div>

      <button onClick={() => router.push('/')} style={{ width:'100%', padding:14, borderRadius:10, border:'none', background:'#534AB7', color:'#fff', fontSize:16, fontWeight:500, cursor:'pointer' }}>
        새 게임 시작
      </button>
    </main>
  )
}
