'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRoom } from '@/lib/use-room'
import { getGamePack } from '@/packs'
import type { FinalResult } from '@/types/game-pack'

const RANK_EMOJI = ['🥇','🥈','🥉','4️⃣','5️⃣','💀']

export default function ResultPage({ params }: { params: { code: string } }) {
  const { code } = params
  const router = useRouter()
  const { room, players } = useRoom(code)
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null)

  useEffect(() => {
    if (room?.status === 'finished' && players.length > 0) {
      try {
        const pack = getGamePack(room.gamePackId)
        const scores: Record<string, number> = {}
        players.forEach(p => { scores[p.id] = p.score })
        setFinalResult(pack.calculateFinalResult(scores, players, room.settings))
      } catch {
        // 게임팩 로드 실패 시 무시
      }
    }
  }, [room?.status, players.length])

  if (!finalResult) return (
    <div style={{ padding:'2rem', textAlign:'center', color:'var(--color-text-tertiary)' }}>결과 계산 중...</div>
  )

  const totalAmount = (room?.settings.totalAmount as number) ?? 35000

  return (
    <main style={{ maxWidth:400, margin:'0 auto', padding:'1.5rem 1rem', fontFamily:'var(--font-sans)' }}>
      <div style={{ textAlign:'center', marginBottom:24 }}>
        <div style={{ fontSize:40, marginBottom:8 }}>🏆</div>
        <h2 style={{ fontSize:20, fontWeight:500, margin:0 }}>최종 결과</h2>
        <p style={{ fontSize:13, color:'var(--color-text-tertiary)', marginTop:4 }}>오늘의 점심 분담</p>
      </div>

      {finalResult.rankings.map((r, i) => (
        <div key={r.playerId} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderRadius:10, border:'0.5px solid var(--color-border-tertiary)', background:'var(--color-background-primary)', marginBottom:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:20 }}>{RANK_EMOJI[i] ?? '💀'}</span>
            <span style={{ fontSize:15, fontWeight:500 }}>{r.nickname}</span>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:17, fontWeight:500 }}>{r.amount.toLocaleString()}원</div>
            <div style={{ fontSize:12, color:'var(--color-text-tertiary)' }}>{Math.round(r.ratio*100)}%</div>
          </div>
        </div>
      ))}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderRadius:10, background:'var(--color-background-secondary)', marginTop:4, marginBottom:24 }}>
        <span style={{ fontSize:14, fontWeight:500 }}>총 점심 금액</span>
        <span style={{ fontSize:16, fontWeight:500 }}>{totalAmount.toLocaleString()}원</span>
      </div>

      <button onClick={() => router.push('/')} style={{ width:'100%', padding:14, borderRadius:10, border:'none', background:'#534AB7', color:'#fff', fontSize:16, fontWeight:500, cursor:'pointer' }}>
        새 게임 시작
      </button>
    </main>
  )
}
