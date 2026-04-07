'use client'

// ============================================================
// 게임 메인 페이지 — 라운드 오케스트레이터
// GamePack 인터페이스를 통해 어떤 게임이든 동일하게 처리
// 이 파일은 게임 종류가 바뀌어도 수정 안 해도 됨
// ============================================================

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
} from '@/lib/supabase'
import type { Room, Player } from '@/types/game-pack'

// 화면 상태
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

  // 내 플레이어 ID는 로컬스토리지에서 (home에서 저장한 snake_case 객체)
  const storedPlayerId = typeof window !== 'undefined'
    ? (() => { try { const r = JSON.parse(localStorage.getItem(`player-${roomCode}`) ?? '{}'); return (r.id ?? '') as string } catch { return '' } })()
    : ''

  // 초기 로드
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

  // 실시간 방 상태 구독
  useEffect(() => {
    const roomSub = subscribeToRoom(roomCode, (updated) => {
      setRoom(updated)
      setScreen(mapStatusToScreen(updated.status))
      if (updated.status === 'playing') {
        setSubmitted(false)   // 라운드 시작 시 제출 상태 초기화
        setAnswerCount(0)
      }
    })

    const playerSub = subscribeToPlayers(roomCode, (ps) => {
      setPlayers(ps)
      setMyPlayer(ps.find((p) => p.id === storedPlayerId) ?? null)
    })

    return () => {
      roomSub.unsubscribe()
      playerSub.unsubscribe()
    }
  }, [roomCode, storedPlayerId])

  // 답변 제출 — GamePack은 여기서 직접 쓰지 않음 (서버에서 계산)
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

  // 방장이 다음 라운드로 넘기기
  const handleNextRound = useCallback(async () => {
    if (!room || myPlayer?.isHost !== true) return
    const nextRound = room.currentRound + 1

    if (nextRound > room.maxRounds) {
      await updateRoomStatus(roomCode, 'finished')
    } else {
      await updateRoomStatus(roomCode, 'playing', nextRound)
    }
  }, [room, myPlayer, roomCode])

  // 현재 GamePack (화면 렌더링에만 사용)
  const gamePack = room ? getGamePack(room.gamePackId) : null
  const roundConfig = gamePack && room
    ? gamePack.getRoundConfig(room.currentRound, room.settings)
    : null

  // ─────────────────────────────────────────
  // 화면 렌더링
  // ─────────────────────────────────────────
  if (screen === 'loading') {
    return <LoadingScreen />
  }

  if (screen === 'waiting') {
    return (
      <WaitingScreen
        room={room!}
        players={players}
        myPlayer={myPlayer}
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

// ─────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────
function mapStatusToScreen(status: Room['status']): Screen {
  const map: Record<Room['status'], Screen> = {
    waiting: 'waiting',
    playing: 'round_play',
    round_end: 'round_result',
    finished: 'final',
  }
  return map[status] ?? 'loading'
}

// ─────────────────────────────────────────
// 하위 컴포넌트 (각각 별도 파일로 분리 권장)
// ─────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500 text-sm">불러오는 중...</p>
    </div>
  )
}

function WaitingScreen({ room, players, myPlayer, onStart }: {
  room: Room; players: Player[]; myPlayer: Player | null
  onStart: () => void
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
        <button
          onClick={onStart}
          disabled={players.length < 2}
          className="w-full py-3 rounded-xl bg-purple-600 text-white font-medium disabled:opacity-40"
        >
          게임 시작 ({players.length}명)
        </button>
      )}
      {!myPlayer?.isHost && (
        <p className="text-center text-sm text-gray-400">방장이 시작하기를 기다리는 중...</p>
      )}
    </div>
  )
}

function RoundPlayScreen({ config, playerCount, submitted, answerCount, onSubmit }: {
  config: ReturnType<typeof import('@/packs/lunch-sagi').lunchSagiPack.getRoundConfig>
  playerCount: number; submitted: boolean; answerCount: number
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
        <p className="text-sm text-gray-500 mt-1">오늘의 점심 분담</p>
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

      <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
        <span className="text-sm font-medium">총 점심 금액</span>
        <span className="text-sm font-medium">{totalAmount.toLocaleString()}원</span>
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
