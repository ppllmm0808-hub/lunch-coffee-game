'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useRoom, useMyPlayer } from '@/lib/use-room'
import { getGamePack } from '@/packs'
import { selectNextGame, finishGame } from '@/lib/supabase'
import { MINI_GAMES } from '@/packs/lunch-sagi'

export default function PlayPage({ params }: { params: { code: string } }) {
  const { code } = params
  const router = useRouter()
  const { room } = useRoom(code)
  const { myPlayer } = useMyPlayer(code)
  const [submitted, setSubmitted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(20)
  const [value, setValue] = useState<Record<string, unknown>>({})

  // stale 클로저 방지용 ref
  const valueRef = useRef(value)
  valueRef.current = value
  const myPlayerRef = useRef(myPlayer)
  myPlayerRef.current = myPlayer
  const submittedRef = useRef(submitted)
  submittedRef.current = submitted

  const pack = room ? (() => { try { return getGamePack(room.gamePackId) } catch { return null } })() : null
  const round = room?.currentRound ?? 1
  const roundConfig = pack ? pack.getRoundConfig(round, room!.settings) : null

  // 최종 결과 화면으로 이동
  useEffect(() => {
    if (room?.status === 'finished') router.push(`/room/${code}/result`)
  }, [room?.status, code, router])

  // 라운드 전환 시 상태 초기화 (playing 상태일 때만)
  useEffect(() => {
    if (room?.status !== 'playing') return
    setSubmitted(false)
    setValue({})
    if (roundConfig) setTimeLeft(roundConfig.timeLimitSec)
  }, [round, room?.status])

  async function submitAnswer(v: Record<string, unknown>) {
    if (submittedRef.current || !myPlayerRef.current) return
    setSubmitted(true)
    submittedRef.current = true
    await fetch('/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: code, playerId: myPlayerRef.current.id, value: v }),
    })
  }

  // 타이머 — playing 상태일 때만 동작
  useEffect(() => {
    if (submitted || room?.status !== 'playing') return
    let remaining = roundConfig?.timeLimitSec ?? 20
    setTimeLeft(remaining)
    const t = setInterval(() => {
      remaining -= 1
      setTimeLeft(remaining)
      if (remaining <= 0) {
        clearInterval(t)
        submitAnswer(valueRef.current)
      }
    }, 1000)
    return () => clearInterval(t)
  }, [submitted, round, room?.status])

  const isHost = myPlayer?.isHost ?? false
  const isLastRound = round >= (room?.maxRounds ?? 3)

  if (!pack || !room || !roundConfig) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>불러오는 중...</div>
  }

  // ─── 라운드 종료 화면 ───────────────────────────────────────
  if (room.status === 'round_end') {
    return (
      <main style={{ maxWidth: 400, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'var(--font-sans)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32, paddingTop: 16 }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🎯</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>라운드 {round} 완료!</h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-tertiary)', marginTop: 8 }}>점수는 마지막에 공개됩니다</p>
        </div>

        {/* 방장 — 마지막 라운드: 최종 결과 버튼 */}
        {isHost && isLastRound && (
          <button
            onClick={() => finishGame(code)}
            style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: '#534AB7', color: '#fff', fontSize: 16, fontWeight: 500, cursor: 'pointer' }}>
            최종 결과 보기
          </button>
        )}

        {/* 방장 — 다음 라운드: 게임 선택 카드 */}
        {isHost && !isLastRound && (
          <>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>다음 라운드 게임 선택</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {MINI_GAMES.map(game => (
                <button
                  key={game.id}
                  onClick={() => selectNextGame(code, round + 1, game.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 12,
                    border: '1.5px solid var(--color-border-secondary)',
                    background: 'var(--color-background-primary)',
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                  <span style={{ fontSize: 28 }}>{game.emoji}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>{game.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{game.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* 일반 참가자 */}
        {!isHost && (
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--color-text-tertiary)' }}>
            {isLastRound ? '방장이 결과를 확인하는 중...' : '방장이 다음 게임을 선택하는 중...'}
          </p>
        )}
      </main>
    )
  }

  // ─── 라운드 진행 화면 ───────────────────────────────────────
  return (
    <main style={{ maxWidth: 400, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'var(--font-sans)' }}>
      {/* 진행 상태 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>라운드 {round}/{room.maxRounds}</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: timeLeft <= 5 ? '#E24B4A' : 'var(--color-text-secondary)' }}>{timeLeft}초</span>
      </div>
      <div style={{ height: 4, background: 'var(--color-background-secondary)', borderRadius: 2, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#534AB7', borderRadius: 2, width: `${(round / room.maxRounds) * 100}%`, transition: 'width .3s' }} />
      </div>

      {/* 게임 설명 */}
      <div style={{ background: 'var(--color-background-secondary)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 4px' }}>{roundConfig.title}</p>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>{roundConfig.instruction}</p>
      </div>

      {submitted ? (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-tertiary)' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
          <p>제출 완료! 다른 참가자를 기다리는 중...</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 8 }}>점수는 마지막에 공개됩니다</p>
        </div>
      ) : (
        <>
          {/* 숫자 예측 */}
          {roundConfig.gameType === 'number' && (
            <div>
              <input
                type="number" min={1} max={100}
                value={String(value.number ?? '')}
                onChange={e => setValue({ number: parseInt(e.target.value) || 0 })}
                placeholder="1 ~ 100"
                style={{ width: '100%', padding: '16px 0', fontSize: 36, textAlign: 'center', border: '1.5px solid var(--color-border-secondary)', borderRadius: 10, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', boxSizing: 'border-box', marginBottom: 16 }}
              />
              <button
                onClick={() => submitAnswer(value)}
                style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: '#534AB7', color: '#fff', fontSize: 16, fontWeight: 500, cursor: 'pointer' }}>
                선택 확정
              </button>
            </div>
          )}

          {/* 다수결 반대 */}
          {roundConfig.gameType === 'animal' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {['🐶 강아지', '🐱 고양이', '🐸 개구리', '🦊 여우'].map(opt => {
                  const selected = value.choice === opt
                  return (
                    <button key={opt} onClick={() => setValue({ choice: opt })}
                      style={{ padding: '20px 0', borderRadius: 10, border: selected ? '2px solid #534AB7' : '1.5px solid var(--color-border-secondary)', background: selected ? '#EEEDFE' : 'var(--color-background-secondary)', fontSize: 15, fontWeight: 500, cursor: 'pointer', color: selected ? '#534AB7' : 'var(--color-text-primary)' }}>
                      {opt}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => submitAnswer(value)} disabled={!value.choice}
                style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: value.choice ? '#534AB7' : 'var(--color-background-secondary)', color: value.choice ? '#fff' : 'var(--color-text-tertiary)', fontSize: 16, fontWeight: 500, cursor: value.choice ? 'pointer' : 'not-allowed' }}>
                선택 확정
              </button>
            </div>
          )}

          {/* 타이밍 챌린지 */}
          {roundConfig.gameType === 'timing' && (
            <TimingRound onSubmit={v => submitAnswer(v)} />
          )}
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
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 56, fontWeight: 500, margin: '2rem 0 0.5rem', color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
        {done ? elapsed.toFixed(2) : started ? elapsed.toFixed(2) : '0.00'}
      </div>
      <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: '2rem' }}>
        {done ? '기록 완료!' : started ? '정확히 3초에 누르세요!' : '시작 버튼을 누르세요'}
      </p>
      {!done && (
        <button onClick={handlePress}
          style={{ width: '100%', padding: 16, borderRadius: 10, border: 'none', background: started ? '#E24B4A' : '#534AB7', color: '#fff', fontSize: 18, fontWeight: 500, cursor: 'pointer' }}>
          {started ? '지금!' : '시작'}
        </button>
      )}
    </div>
  )
}
