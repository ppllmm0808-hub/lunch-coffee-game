'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useRoom, useMyPlayer } from '@/lib/use-room'
import { getGamePack } from '@/packs'
import { finishGame, selectNextGame } from '@/lib/supabase'
import { MINI_GAMES } from '@/packs/lunch-sagi'

export default function PlayPage({ params }: { params: { code: string } }) {
  const { code } = params
  const router = useRouter()
  const { room, players, forceRefresh } = useRoom(code)
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

  // 제출 후 폴링 — Realtime이 느리거나 안 올 때 대비, 모든 플레이어 적용
  useEffect(() => {
    if (!submitted) return
    const interval = setInterval(() => forceRefresh(), 2000)
    return () => clearInterval(interval)
  }, [submitted])

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
    const res = await fetch('/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: code, playerId: myPlayerRef.current.id, value: v }),
    })
    const data = await res.json()
    // Realtime이 느릴 경우를 대비해 마지막 제출자가 직접 방 상태 갱신
    if (data.allSubmitted) forceRefresh()
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

        {/* 방장 — 다음 라운드: 게임 선택 → 즉시 시작 */}
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
          {/* 카드 게임 */}
          {roundConfig.gameType === 'card' && (
            <CardRound
              playerId={myPlayer?.id ?? ''}
              roundNum={round}
              onSubmit={v => submitAnswer(v)}
            />
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

function CardRound({ playerId, roundNum, onSubmit }: {
  playerId: string
  roundNum: number
  onSubmit: (v: Record<string, unknown>) => void
}) {
  const [cards, setCards] = useState<[number, number]>(() => {
    let seed = 0
    for (const ch of (playerId + roundNum)) seed = (seed * 31 + ch.charCodeAt(0)) % 1_000_000_007
    const c1 = (seed % 10) + 1
    seed = (seed * 31 + 17) % 1_000_000_007
    const c2 = (seed % 10) + 1
    return [c1, c2]
  })
  const initialCards = useRef(cards)
  const [replaced, setReplaced] = useState(false)
  const [replacing, setReplacing] = useState(false)

  function selectCardToReplace(index: 0 | 1) {
    const newCard = Math.floor(Math.random() * 10) + 1
    const newCards: [number, number] = [cards[0], cards[1]]
    newCards[index] = newCard
    setCards(newCards)
    setReplaced(true)
    setReplacing(false)
  }

  const sum = cards[0] + cards[1]

  return (
    <div>
      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
        합계: <strong style={{ color: 'var(--color-text-primary)', fontSize: 20 }}>{sum}</strong>
        {' '}/ 목표: 10
      </p>

      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', margin: '16px 0 8px' }}>
        {cards.map((card, i) => (
          <div
            key={i}
            onClick={() => replacing ? selectCardToReplace(i as 0 | 1) : undefined}
            style={{
              width: 110, height: 150, borderRadius: 14,
              background: replacing ? '#FFF8E1' : 'var(--color-background-secondary)',
              border: replacing ? '2.5px solid #F59E0B' : '2px solid var(--color-border-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 56, fontWeight: 700,
              cursor: replacing ? 'pointer' : 'default',
              boxShadow: replacing ? '0 0 0 3px #FDE68A' : 'none',
              transition: 'all 0.15s',
            }}
          >{card}</div>
        ))}
      </div>

      {replacing && (
        <p style={{ textAlign: 'center', fontSize: 13, color: '#F59E0B', marginBottom: 12 }}>
          교체할 카드를 탭하세요
        </p>
      )}

      <button
        onClick={() => setReplacing(true)}
        disabled={replaced || replacing}
        style={{
          width: '100%', padding: 12, borderRadius: 10, marginBottom: 10,
          border: '1.5px solid var(--color-border-secondary)',
          background: (replaced || replacing) ? 'var(--color-background-secondary)' : 'var(--color-background-primary)',
          color: (replaced || replacing) ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
          fontSize: 15, fontWeight: 500,
          cursor: (replaced || replacing) ? 'not-allowed' : 'pointer',
        }}
      >
        {replaced ? '✅ 교체 완료' : replacing ? '교체할 카드 선택 중...' : '🔄 교체하기'}
      </button>

      {!replacing && (
        <button
          onClick={() => onSubmit({ cards: initialCards.current, finalCards: cards, replaced })}
          style={{
            width: '100%', padding: 14, borderRadius: 10, border: 'none',
            background: '#534AB7', color: '#fff', fontSize: 16, fontWeight: 500, cursor: 'pointer',
          }}
        >
          확정
        </button>
      )}
    </div>
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
