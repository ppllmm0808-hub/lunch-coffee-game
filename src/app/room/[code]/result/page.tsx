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
      } catch {}
    }
  }, [room?.status, players.length])

  if (!finalResult) return (
    <div style={{ padding:'2rem', textAlign:'center', color:'var(--color-text-tertiary)' }}>결과 계산 중...</div>
  )

  return (
    <main style={{ maxWidth:400, margin:'0 auto', padding:'1.5rem 1rem', fontFamily:'var(--font-sans)' }}>

      {/* 헤더 */}
      <div style={{ textAlign:'center', marginBottom:24 }}>
        <div style={{ fontSize:40, marginBottom:8 }}>🏆</div>
        <h2 style={{ fontSize:20, fontWeight:600, margin:0 }}>최종 결과</h2>
      </div>

      {/* 라운드별 결과 */}
      {finalResult.roundResults?.map((round, ri) => (
        <div key={ri} style={{ marginBottom:20 }}>
          <p style={{ fontSize:13, fontWeight:600, color:'var(--color-text-tertiary)', marginBottom:8 }}>
            라운드 {ri + 1} — {round.title}
          </p>
          {round.rankings.map((r, i) => (
            <div key={r.playerId} style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'10px 14px', borderRadius:10,
              border:'0.5px solid var(--color-border-tertiary)',
              background:'var(--color-background-primary)',
              marginBottom:6,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:18 }}>{RANK_EMOJI[i] ?? '💀'}</span>
                <span style={{ fontSize:14, fontWeight:500 }}>{r.nickname}</span>
              </div>
              <span style={{ fontSize:13, color:'var(--color-text-tertiary)' }}>{r.detail}</span>
            </div>
          ))}
        </div>
      ))}

      {/* 최종 순위 */}
      <div style={{ marginBottom:24 }}>
        <p style={{ fontSize:13, fontWeight:600, color:'var(--color-text-tertiary)', marginBottom:8 }}>
          🏅 최종 순위
        </p>
        {finalResult.rankings.map((r, i) => (
          <div key={r.playerId} style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'12px 14px', borderRadius:10,
            border: i === 0 ? '1.5px solid #534AB7' : '0.5px solid var(--color-border-tertiary)',
            background: i === 0 ? '#EEEDFE' : 'var(--color-background-primary)',
            marginBottom:8,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:20 }}>{RANK_EMOJI[i] ?? '💀'}</span>
              <span style={{ fontSize:15, fontWeight:600 }}>{r.nickname}</span>
            </div>
            <span style={{ fontSize:13, color:'var(--color-text-tertiary)' }}>{r.totalScore}점</span>
          </div>
        ))}
      </div>

      {/* 다음 게임 버튼 */}
      <button
        onClick={() => router.push('/')}
        style={{
          width:'100%', padding:14, borderRadius:10, border:'none',
          background:'#534AB7', color:'#fff', fontSize:16, fontWeight:500, cursor:'pointer'
        }}>
        다음 게임 시작
      </button>

    </main>
  )
}