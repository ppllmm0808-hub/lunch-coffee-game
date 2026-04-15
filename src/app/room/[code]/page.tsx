'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { getGamePack } from '@/packs'
import {
  getRoom,
  getPlayers,
  submitAnswer,
  subscribeToRoom,
  subscribeToPlayers,
  updateRoomStatus,
  updateMoleTargetSec,
} from '@/lib/supabase'
import type { Room, Player } from '@/types/game-pack'

type Screen = 'loading' | 'waiting' | 'round_play' | 'round_result' | 'final'

export default function GamePage() {
  const params = useParams()
  const roomCode = (params.code as string).toUpperCase()

  const [screen, setScreen] = useState<Screen>('loading')
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [myPlayer, setMyPlayer] = useState<Player | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [answerCount, setAnswerCount] = useState(0)
  const [moleTargetSec, setMoleTargetSec] = useState(30)
  const [storedPlayerId, setStoredPlayerId] = useState('')
  const [timeoutCountdown, setTimeoutCountdown] = useState<number | null>(null)

  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem(`player-${roomCode}`) ?? '{}')
      setStoredPlayerId((r.id ?? '') as string)
    } catch { /* ignore */ }
  }, [roomCode])

  useEffect(() => {
    if (!roomCode) return
    loadRoom()
  }, [roomCode])

  async function loadRoom() {
    const [r, ps] = await Promise.all([getRoom(roomCode), getPlayers(roomCode)])
    if (!r) { setScreen('loading'); return }
    setRoom(r)
    setPlayers(ps)
    setMyPlayer(ps.find((p) => p.id === storedPlayerId) ?? null)
    setScreen(r.status === 'waiting' ? 'waiting' : mapStatusToScreen(r.status))
  }

  useEffect(() => {
    const roomSub = subscribeToRoom(roomCode, (updated) => {
      setRoom(updated)
      setScreen(mapStatusToScreen(updated.status))
      if (updated.status === 'playing') {
        setSubmitted(false)
        setAnswerCount(0)
      }
    })

    const playerSub = subscribeToPlayers(roomCode, (ps) => {
      setPlayers(ps)
      setMyPlayer(ps.find((p) => p.id === storedPlayerId) ?? null)
    })
    const pollInterval = setInterval(loadRoom, 3000)
    return () => {
      roomSub.unsubscribe()
      playerSub.unsubscribe()
      clearInterval(pollInterval)
    }
  }, [roomCode, storedPlayerId])

  const handleSubmit = useCallback(async (value: unknown) => {
    if (!myPlayer || !room || submitted) return
    setSubmitted(true)
    await submitAnswer({
      roomCode,
      roundNum: room.currentRound,
      playerId: myPlayer.id,
      value,
    })
    setAnswerCount((c) => c + 1)
  }, [myPlayer, room, submitted, roomCode])

 useEffect(() => {
  if (screen !== 'round_play' || submitted || roundConfig?.gameType === 'mole') return
  const timer = setTimeout(async () => {
    if (!submitted) {
      await handleSubmit({ timeout: true, moleCount: 0, elapsedSec: 999, ms: 0 })
    }
  }, 30000)
  let count = 30
  const countdown = setInterval(() => {
    count--
    setTimeoutCountdown(count)
    if (count <= 0) clearInterval(countdown)
  }, 1000)
  return () => {
    clearTimeout(timer)
    clearInterval(countdown)
    setTimeoutCountdown(null)
  }
}, [screen, submitted])

  const handleNextRound = useCallback(async () => {
    if (!room || myPlayer?.isHost !== true) return
    const nextRound = room.currentRound + 1
    if (nextRound > room.maxRounds) {
      await updateRoomStatus(roomCode, 'finished')
    } else {
      await updateRoomStatus(roomCode, 'playing', nextRound)
    }
  }, [room, myPlayer, roomCode])

  const gamePack = room ? getGamePack(room.gamePackId) : null
  const roundConfig = gamePack && room
    ? gamePack.getRoundConfig(room.currentRound, room.settings)
    : null

  if (screen === 'loading') return <LoadingScreen />

  if (screen === 'waiting') {
    return (
      <WaitingScreen
  room={room!}
  players={players}
  myPlayer={myPlayer}
  moleTargetSec={moleTargetSec}
  onSetMoleTime={async (sec) => {
    setMoleTargetSec(sec)
    await updateMoleTargetSec(roomCode, sec)
  }}
  onStart={async () => {
    if (players.length < 2) return
    await updateRoomStatus(roomCode, 'playing', 1)
  }}
/>
    )
  }

  if (screen === 'round_play' && roundConfig) {
    return (
      <RoundPlayScreen
        config={roundConfig}
        playerCount={players.length}
        submitted={submitted}
        answerCount={answerCount}
        moleTargetSec={moleTargetSec}
        timeoutCountdown={timeoutCountdown}
        onSubmit={handleSubmit}
      />
    )
  }

  if (screen === 'round_result') {
    return (
      <RoundResultScreen
        roundNum={room!.currentRound}
        isHost={myPlayer?.isHost ?? false}
        onNext={handleNextRound}
      />
    )
  }

  if (screen === 'final') {
    return (
      <FinalScreen
        roomCode={roomCode}
        players={players}
        settings={room!.settings}
      />
    )
  }

  return <LoadingScreen />
}

function mapStatusToScreen(status: Room['status']): Screen {
  const map: Record<Room['status'], Screen> = {
    waiting: 'waiting',
    playing: 'round_play',
    round_end: 'round_play',
    finished: 'final',
  }
  return map[status] ?? 'loading'
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500 text-sm">불러오는 중...</p>
    </div>
  )
}

function WaitingScreen({ room, players, myPlayer, onStart, moleTargetSec, onSetMoleTime }: {
  room: Room; players: Player[]; myPlayer: Player | null
  onStart: () => void
  moleTargetSec: number
  onSetMoleTime: (sec: number) => void
}) {
  return (
    <div className="max-w-sm mx-auto p-6">
      <div className="text-center mb-6">
        <div className="text-3xl mb-2">🍱</div>
        <h1 className="text-xl font-medium">대기실</h1>
        <p className="text-sm text-gray-500 mt-1">방 코드: <strong>{room.code}</strong></p>
      </div>

      <div className="space-y-2 mb-6">
        {players.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white">
            <span className="text-sm font-medium">{p.nickname}</span>
            <span className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-700">
              {p.isHost ? '방장' : '참가중'}
            </span>
          </div>
        ))}
      </div>

      {myPlayer?.isHost && (
        <>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              🦔 두더지 게임 목표 시간
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[15, 30, 45, 60].map(sec => (
                <button
                  key={sec}
                  onClick={() => onSetMoleTime(sec)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 10,
                    border: moleTargetSec === sec ? '2px solid #534AB7' : '1.5px solid #e5e7eb',
                    background: moleTargetSec === sec ? '#EEEDFE' : '#fff',
                    color: moleTargetSec === sec ? '#534AB7' : '#374151',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {sec}초
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={onStart}
            disabled={players.length < 2}
            className="w-full py-3 rounded-xl bg-purple-600 text-white font-medium disabled:opacity-40"
          >
            게임 시작 ({players.length}명)
          </button>
        </>
      )}
      {!myPlayer?.isHost && (
        <p className="text-center text-sm text-gray-400">방장이 시작하기를 기다리는 중...</p>
      )}
    </div>
  )
}

function RoundPlayScreen({ config, playerCount, submitted, answerCount, moleTargetSec, onSubmit }: {
  config: ReturnType<typeof import('@/packs/lunch-sagi').lunchSagiPack.getRoundConfig>
  playerCount: number; submitted: boolean; answerCount: number
  moleTargetSec: number
  timeoutCountdown: number | null
  onSubmit: (v: unknown) => void
}) {
  const [value, setValue] = useState<string>('')

  return (
    <div className="max-w-sm mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs px-3 py-1 rounded-full bg-purple-50 text-purple-700 font-medium">
          라운드 {config.roundNum}
        </span>
        <span className="text-xs text-gray-400">
          {answerCount}/{playerCount} 제출
        </span>
      </div>

      <h2 className="text-base font-medium mb-2">{config.title}</h2>
      <p className="text-sm text-gray-500 whitespace-pre-line mb-6">{config.instruction}</p>

      {!submitted ? (
        <>
          {(config.gameType as string) === 'mole' ? (
            <MoleRoundInline
              targetSec={moleTargetSec}
              onSubmit={onSubmit}
            />
          ) : (
            <>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="입력하세요"
                className="w-full p-3 border border-gray-200 rounded-xl text-center text-lg mb-4"
              />
              <button
                onClick={() => value && onSubmit(value)}
                className="w-full py-3 rounded-xl bg-purple-600 text-white font-medium"
              >
                선택 확정
              </button>
            </>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-sm text-gray-500">제출 완료! 다른 플레이어를 기다리는 중...</p>
          <p className="text-xs text-gray-400 mt-1">{answerCount}/{playerCount}명 제출</p>
        </div>
      )}
    </div>
  )
}

function MoleRoundInline({ targetSec, onSubmit }: {
  targetSec: number
  onSubmit: (v: unknown) => void
}) {
  const [started, setStarted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [moleCount, setMoleCount] = useState(0)
  const [molePos, setMolePos] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const [penalty, setPenalty] = useState(0)
  const startTimeRef = useState(() => ({ current: 0 }))[0]
  const timerRef = useState(() => ({ current: null as NodeJS.Timeout | null }))[0]
  const moleTimerRef = useState(() => ({ current: null as NodeJS.Timeout | null }))[0]

  const GRID = 9

  function spawnMole() {
    const pos = Math.floor(Math.random() * GRID)
    setMolePos(pos)
    moleTimerRef.current = setTimeout(() => {
      setMolePos(null)
      if (!done) spawnMole()
    }, 800)
  }

  function handleStart() {
    setStarted(true)
    startTimeRef.current = Date.now()
    spawnMole()
    timerRef.current = setInterval(() => {
      const el = (Date.now() - startTimeRef.current) / 1000
      setElapsed(el)
      if (el > targetSec) {
        const over = el - targetSec
        setPenalty(Math.floor(over / 10) * 10)
      }
    }, 100)
  }

  function handleStop() {
    if (!started || done) return
    setDone(true)
    clearInterval(timerRef.current!)
    clearTimeout(moleTimerRef.current!)
    setMolePos(null)
    const el = (Date.now() - startTimeRef.current) / 1000
    const over = Math.max(0, el - targetSec)
    const pen = Math.floor(over / 10) * 10
    onSubmit({ moleCount, penalty: pen, elapsedSec: Math.round(el) })
  }

  function handleMole(i: number) {
    if (!started || done || molePos !== i) return
    setMoleCount(c => c + 1)
    setMolePos(null)
    clearTimeout(moleTimerRef.current!)
    spawnMole()
  }

  const isOver = elapsed > targetSec

  return (
    <div style={{ textAlign: 'center' }}>
      {!started && (
        <div style={{ fontSize: 80, fontWeight: 700, marginBottom: 8, color: '#534AB7' }}>
          {targetSec}
        </div>
      )}
      
      <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
        목표: {targetSec}초 이내
      </p>

      <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        🦔 {moleCount}마리
      </p>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 10, marginBottom: 20, maxWidth: 300, margin: '0 auto 20px',
      }}>
        {Array.from({ length: GRID }).map((_, i) => (
          <div
            key={i}
            onClick={() => handleMole(i)}
            style={{
              height: 90, borderRadius: 16,
              background: molePos === i ? '#F59E0B' : 'var(--color-background-secondary)',
              border: molePos === i ? '3px solid #D97706' : '2px solid var(--color-border-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 44, cursor: molePos === i ? 'pointer' : 'default',
              transition: 'all 0.1s',
              transform: molePos === i ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {molePos === i ? '🦔' : ''}
          </div>
        ))}
      </div>

      {!started ? (
        <button onClick={handleStart} style={{
          width: '100%', padding: 16, borderRadius: 10, border: 'none',
          background: '#534AB7', color: '#fff', fontSize: 18, fontWeight: 600, cursor: 'pointer',
        }}>
          시작!
        </button>
      ) : !done ? (
        <button onClick={handleStop} style={{
          width: '100%', padding: 16, borderRadius: 10, border: 'none',
          background: '#E24B4A', color: '#fff', fontSize: 18, fontWeight: 700, cursor: 'pointer',
        }}>
          STOP
        </button>
      ) : (
        <div style={{ fontSize: 16, color: 'var(--color-text-tertiary)' }}>
          제출 완료! 결과 기다리는 중...
        </div>
      )}
    </div>
  )
}

function RoundResultScreen({ roundNum, isHost, onNext }: {
  roundNum: number; isHost: boolean; onNext: () => void
}) {
  return (
    <div className="max-w-sm mx-auto p-6 text-center">
      <div className="text-3xl mb-4">🎯</div>
      <h2 className="text-xl font-medium mb-2">라운드 {roundNum} 결과</h2>
      <p className="text-sm text-gray-500 mb-6">점수는 마지막에 공개됩니다</p>
      {isHost && (
        <button onClick={onNext} className="w-full py-3 rounded-xl bg-purple-600 text-white font-medium">
          {roundNum < 3 ? `라운드 ${roundNum + 1} 시작` : '최종 결과 보기'}
        </button>
      )}
      {!isHost && <p className="text-sm text-gray-400">방장이 다음으로 넘기길 기다리는 중...</p>}
    </div>
  )
}

function FinalScreen({ roomCode, players, settings }: {
  roomCode: string; players: Player[]; settings: Record<string, unknown>
}) {
  const sorted = [...players].sort((a, b) => b.score - a.score)
  const totalAmount = (settings.totalAmount as number) || 35000
  const ratios = [0, 0, 0.2, 0.3, 0.5, 0.5]
  const emojis = ['🥇', '🥈', '🥉', '4️⃣', '💀', '💀']

  return (
    <div className="max-w-sm mx-auto p-6">
      <div className="text-center mb-6">
        <div className="text-3xl mb-2">🏆</div>
        <h1 className="text-xl font-medium">최종 결과</h1>
      </div>

      <div className="space-y-2 mb-4">
        {sorted.map((p, i) => {
          const ratio = ratios[Math.min(i, ratios.length - 1)]
          const amount = Math.round(totalAmount * ratio)
          return (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white">
              <div className="flex items-center gap-2">
                <span className="text-lg">{emojis[i]}</span>
                <span className="text-sm font-medium">{p.nickname}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{amount.toLocaleString()}원</div>
                <div className="text-xs text-gray-400">{Math.round(ratio * 100)}%</div>
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={() => window.location.href = '/'}
        className="w-full mt-4 py-3 rounded-xl bg-purple-600 text-white font-medium"
      >
        새 게임 시작
      </button>
    </div>
  )
}