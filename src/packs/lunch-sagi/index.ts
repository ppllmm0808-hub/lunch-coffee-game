// ============================================================
// 점심 사기 게임팩 — MVP 첫 번째 게임
// GamePack 인터페이스를 완전히 구현한 예시
// 나중에 개경주도 이 구조 그대로 복사해서 만들면 됨
// ============================================================

import type {
  GamePack,
  GamePackMeta,
  RoundConfig,
  Answer,
  RoundResult,
  FinalResult,
  GameSettings,
} from '@/types/game-pack'

const meta: GamePackMeta = {
  id: 'lunch-sagi',
  name: '점심 사기 게임',
  description: '꼴찌가 점심 더 낸다. 3라운드 심리전.',
  category: 'cost',
  minPlayers: 2,
  maxPlayers: 6,
  roundCount: 3,
  estimatedMinutes: 3,
  isPremium: false,
  emoji: '🍱',
}

// 라운드 선택 화면에서 표시할 미니게임 목록
export const MINI_GAMES = [
  { id: 'number' as const, emoji: '🔢', title: '숫자 예측', desc: '평균의 60%에 가장 가까운 숫자를 골라라' },
  { id: 'animal' as const, emoji: '🐾', title: '다수결 반대', desc: '가장 적은 사람이 선택할 동물을 골라라' },
  { id: 'timing' as const, emoji: '⏱️', title: '타이밍 챌린지', desc: '정확히 3.00초에 버튼 누르기' },
]

type GameType = 'number' | 'animal' | 'timing'

// 라운드별 기본 게임 설정 (host가 선택 안 했을 때 폴백)
const ROUND_CONFIGS: Omit<RoundConfig, 'roundNum'>[] = [
  {
    timeLimitSec: 20,
    gameType: 'number',
    title: '숫자 예측',
    instruction: '1~100 사이 숫자를 고르세요.\n모든 참가자 평균의 60%에 가장 가까운 사람이 이깁니다.',
  },
  {
    timeLimitSec: 20,
    gameType: 'animal',
    title: '다수결 반대',
    instruction: '가장 적은 사람이 선택할 것 같은 동물을 고르세요.',
  },
  {
    timeLimitSec: 30,
    gameType: 'timing',
    title: '타이밍 챌린지',
    instruction: '정확히 3.00초에 버튼을 누르세요.',
  },
]

// 인원 수에 따라 점심값 분담 비율 계산 (1등~꼴지 순)
// 2명: [0, 1.0] / 3명: [0, 0.30, 0.70] / 4명+: 꼴지부터 50%·30%·20% 역순 배분
function getRatios(n: number): number[] {
  if (n === 2) return [0, 1.0]
  if (n === 3) return [0, 0.30, 0.70]
  // n >= 4: 하위 3명만 부담, 나머지 0%
  const bottom = [0.50, 0.30, 0.20]
  const ratios = Array(n).fill(0)
  for (let i = 0; i < Math.min(bottom.length, n - 1); i++) {
    ratios[n - 1 - i] = bottom[i]
  }
  return ratios
}

function getRoundConfig(roundNum: number, settings: GameSettings): RoundConfig {
  const typeMap: Record<GameType, number> = { number: 0, animal: 1, timing: 2 }
  const gameType = settings.currentGameType as GameType | undefined
  const idx = gameType !== undefined && typeMap[gameType] !== undefined
    ? typeMap[gameType]
    : Math.min(roundNum - 1, ROUND_CONFIGS.length - 1)
  return { roundNum, ...ROUND_CONFIGS[idx] }
}

// 답변 value 구조로 게임 타입 자동 감지
function detectGameType(answers: Answer[]): GameType | null {
  if (answers.length === 0) return null
  const first = answers[0].value as Record<string, unknown>
  if ('number' in first) return 'number'
  if ('choice' in first) return 'animal'
  if ('ms' in first) return 'timing'
  return null
}

function calculateRoundScore(answers: Answer[], roundNum: number): RoundResult[] {
  const type = detectGameType(answers)
  if (type === 'number') return calcNumber(answers)
  if (type === 'animal') return calcAnimal(answers)
  if (type === 'timing') return calcTiming(answers)
  // 폴백: 라운드 번호 기반
  if (roundNum === 1) return calcNumber(answers)
  if (roundNum === 2) return calcAnimal(answers)
  return calcTiming(answers)
}

// 숫자 예측: 평균의 60%에 가장 가까운 숫자
function calcNumber(answers: Answer[]): RoundResult[] {
  const nums = answers.map((a) => {
    const v = a.value as Record<string, unknown>
    return { id: a.playerId, n: Number(v.number) || 50 }
  })
  const avg = nums.reduce((s, x) => s + x.n, 0) / nums.length
  const target = avg * 0.6

  return nums.map(({ id, n }) => {
    const diff = Math.abs(n - target)
    const score = Math.max(0, Math.round(100 - diff * 4))
    return {
      playerId: id,
      scoreDelta: score,
      detail: `목표 ${target.toFixed(1)} / 선택 ${n} / 오차 ${diff.toFixed(1)} → ${score}점`,
    }
  })
}

// 다수결 반대: 가장 적게 선택된 것 = 고득점
function calcAnimal(answers: Answer[]): RoundResult[] {
  const counts: Record<string, number> = {}
  answers.forEach((a) => {
    const v = String((a.value as Record<string, unknown>).choice ?? a.value)
    counts[v] = (counts[v] || 0) + 1
  })
  const minCount = Math.min(...Object.values(counts))

  return answers.map((a) => {
    const v = String((a.value as Record<string, unknown>).choice ?? a.value)
    const isRare = counts[v] === minCount
    const score = isRare ? 100 : Math.max(0, 100 - (counts[v] - minCount) * 25)
    return {
      playerId: a.playerId,
      scoreDelta: score,
      detail: `${v} 선택 (${counts[v]}명) → ${score}점`,
    }
  })
}

// 타이밍 챌린지: 3.00초에 얼마나 가까운지
function calcTiming(answers: Answer[]): RoundResult[] {
  return answers.map((a) => {
    const ms = Number((a.value as Record<string, unknown>).ms) || 0
    const diff = Math.abs(ms - 3000)
    const score = Math.max(0, Math.round(100 - diff / 30))
    return {
      playerId: a.playerId,
      scoreDelta: score,
      detail: `${(ms / 1000).toFixed(3)}초 / 오차 ${(diff / 1000).toFixed(3)}초 → ${score}점`,
    }
  })
}

function calculateFinalResult(
  scores: Record<string, number>,
  players: { id: string; nickname: string }[],
  settings: GameSettings
): FinalResult {
  const totalAmount = (settings.totalAmount as number) || 35000

  const ratios = getRatios(players.length)
  const ranked = [...players]
    .sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
    .map((p, i) => {
      const ratio = ratios[i]
      return {
        rank: i + 1,
        playerId: p.id,
        nickname: p.nickname,
        totalScore: scores[p.id] || 0,
        ratio,
        amount: Math.round(totalAmount * ratio),
      }
    })

  return { rankings: ranked, totalAmount }
}

// GamePack 인터페이스 구현체 export
export const lunchSagiPack: GamePack = {
  meta,
  getRoundConfig,
  calculateRoundScore,
  calculateFinalResult,
}
