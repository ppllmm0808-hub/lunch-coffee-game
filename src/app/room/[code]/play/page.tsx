'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useRoom, useMyPlayer } from '@/lib/use-room'
import { GamePackRegistry } from '@/lib/game-pack.registry'

export default function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const router = useRouter()
  const { room, players } = useRoom(code)
  const { myPlayer } = useMyPlayer(code)
  const [submitted, setSubmitted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(20)
  const [value, setValue] = useState<Record<string, unknown>>({})

  const pack = room ? GamePackRegistry.get(room.game_pack_id) : null
  const round = room?.current_round ?? 1
  const instruction = pack?.getRoundInstruction(round)

  // 게임 종료 감지
  useEffect(() => {
    if (room?.status === 'finished') router.push(`/room/${code}/result`)
  }, [room?.status, code, router])

  // 라운드 변경 시 상태 리셋
  useEffect(() => {
    setSubmitted(false)
    setValue({})
    if (instruction) setTimeLeft(instruction.timeoutSeconds)
  }, [round])

  // 타이머
  useEffect(() => {
    if (submitted) return
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(t); handleSubmit(value); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [submitted, round])

  const handleSubmit = useCallback(async (v: Record<string, unknown>) => {
    if (submitted || !myPlayer) return
    setSubmitted(true)
    await fetch('/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: code, playerId: myPlayer.id, value: v }),
    })
  }, [submitted, myPlayer, code])

  if (!pack || !room) return <div style={{ padding:'2rem', textAlign:'center', color:'var(--color-text-tertiary)' }}>불러오는 중...</div>

  return (
    <main style={{ maxWidth:400, margin:'0 auto', padding:'1.5rem 1rem', fontFamily:'var(--font-sans)' }}>
      {/* 진행 바 */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <span style={{ fontSize:12, color:'var(--color-text-tertiary)' }}>라운드 {round}/{room.max_rounds}</span>
        <span style={{ fontSize:12, fontWeight:500, color: timeLeft <= 5 ? '#E24B4A' : 'var(--color-text-secondary)' }}>{timeLeft}초</span>
      </div>
      <div style={{ height:4, background:'var(--color-background-secondary)', borderRadius:2, marginBottom:20, overflow:'hidden' }}>
        <div style={{ height:'100%', background:'#534AB7', borderRadius:2, width:`${(round/room.max_rounds)*100}%`, transition:'width .3s' }} />
      </div>

      {/* 지시문 */}
      <div style={{ background:'var(--color-background-secondary)', borderRadius:10, padding:'14px 16px', marginBottom:20 }}>
        <p style={{ fontSize:13, fontWeight:500, margin:'0 0 4px' }}>{instruction?.title}</p>
        <p style={{ fontSize:14, color:'var(--color-text-secondary)', margin:0, lineHeight:1.6 }}>{instruction?.description}</p>
      </div>

      {submitted ? (
        <div style={{ textAlign:'center', padding:'2rem 0', color:'var(--color-text-tertiary)' }}>
          <div style={{ fontSize:36, marginBottom:8 }}>✅</div>
          <p>제출 완료! 다른 참가자를 기다리는 중...</p>
        </div>
      ) : (
        <>
          {/* 라운드 1: 숫자 입력 */}
          {round === 1 && (
            <div>
              <input
                type="number" min={1} max={100}
                value={String(value.number ?? '')}
                onChange={e => setValue({ number: parseInt(e.target.value) || 0 })}
                placeholder="1 ~ 100"
                style={{ width:'100%', padding:'16px 0', fontSize:36, textAlign:'center', border:'1.5px solid var(--color-border-secondary)', borderRadius:10, background:'var(--color-background-primary)', color:'var(--color-text-primary)', boxSizing:'border-box', marginBottom:16 }}
              />
              <button onClick={() => handleSubmit(value)} style={{ width:'100%', padding:14, borderRadius:10, border:'none', background:'#534AB7', color:'#fff', fontSize:16, fontWeight:500, cursor:'pointer' }}>
                선택 확정
              </button>
            </div>
          )}

          {/* 라운드 2: 선택지 */}
          {round === 2 && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
                {['🐶 강아지','🐱 고양이','🐸 개구리','🦊 여우'].map(opt => {
                  const emoji = opt.split(' ')[0]
                  const selected = value.choice === opt
                  return (
                    <button key={opt} onClick={() => setValue({ choice: opt })} style={{ padding:'20px 0', borderRadius:10, border: selected ? '2px solid #534AB7':'1.5px solid var(--color-border-secondary)', background: selected ? '#EEEDFE':'var(--color-background-secondary)', fontSize:15, fontWeight:500, cursor:'pointer', color: selected ? '#534AB7':'var(--color-text-primary)' }}>
                      {opt}
                    </button>
                  )
                })}
              </div>
              <button onClick={() => handleSubmit(value)} disabled={!value.choice} style={{ width:'100%', padding:14, borderRadius:10, border:'none', background: value.choice ? '#534AB7':'var(--color-background-secondary)', color: value.choice ? '#fff':'var(--color-text-tertiary)', fontSize:16, fontWeight:500, cursor: value.choice ? 'pointer':'not-allowed' }}>
                선택 확정
              </button>
            </div>
          )}

          {/* 라운드 3: 타이밍 */}
          {round === 3 && <TimingRound onSubmit={v => handleSubmit(v)} />}
        </>
      )}
    </main>
  )
}

function TimingRound({ onSubmit }: { onSubmit: (v: Record<string, unknown>) => void }) {
  const [started, setStarted] = useState(false)
  const [startTime, setStartTime] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!started || done) return
    const t = setInterval(() => setElapsed((performance.now() - startTime) / 1000), 50)
    return () => clearInterval(t)
  }, [started, startTime, done])

  function handlePress() {
    if (!started) { setStarted(true); setStartTime(performance.now()); return }
    const ms = performance.now() - startTime
    setDone(true)
    onSubmit({ ms: Math.round(ms) })
  }

  return (
    <div style={{ textAlign:'center' }}>
      <div style={{ fontSize:56, fontWeight:500, margin:'2rem 0 0.5rem', color:'var(--color-text-primary)', fontVariantNumeric:'tabular-nums' }}>
        {done ? elapsed.toFixed(2) : started ? elapsed.toFixed(2) : '0.00'}
      </div>
      <p style={{ fontSize:13, color:'var(--color-text-tertiary)', marginBottom:'2rem' }}>
        {done ? '기록 완료!' : started ? '정확히 3초에 누르세요!' : '시작 버튼을 누르세요'}
      </p>
      {!done && (
        <button onClick={handlePress} style={{ width:'100%', padding:16, borderRadius:10, border:'none', background: started ? '#E24B4A':'#534AB7', color:'#fff', fontSize:18, fontWeight:500, cursor:'pointer' }}>
          {started ? '지금!' : '시작'}
        </button>
      )}
    </div>
  )
}
