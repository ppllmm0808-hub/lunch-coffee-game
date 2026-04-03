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

// 라운드별 게임 타입 정의
// 나중에 라운드 추가/교체가 여기서만 이루어짐
const ROUND_CONFIGS: Omit<RoundConfig, 'roundNum'>[] = [
  {
    timeLimitSec: 20,
    title: '숫자 예측',
    instruction: '1~100 사이 숫자를 고르세요.\n모든 참가자 평균의 60%에 가장 가까운 사람이 이깁니다.',
  },
  {
    timeLimitSec: 20,
    title: '다수결 반대',
    instruction: '가장 적은 사람이 선택할 것 같은 동물을 고르세요.',
  },
  {
    timeLimitSec: 30,
    title: '타이밍 챌린지',
    instruction: '정확히 3.00초에 버튼을 누르세요.',
  },
]

// 꼴찌~1등 분담 비율 (6명 기준, 인원 적으면 마지막 구간 합산)
const RATIO_TABLE = [0, 0, 0.2, 0.3, 0.5, 0.5] // 1등~꼴지

function getRoundConfig(roundNum: number, _settings: GameSettings): RoundConfig {
  const idx = Math.min(roundNum - 1, ROUND_CONFIGS.length - 1)
  return { roundNum, ...ROUND_CONFIGS[idx] }
}

function calculateRoundScore(answers: Answer[], roundNum: number): RoundResult[] {
  if (roundNum === 1) return calcRound1(answers)
  if (roundNum === 2) return calcRound2(answers)
  if (roundNum === 3) return calcRound3(answers)
  return answers.map((a) => ({ playerId: a.playerId, scoreDelta: 0, detail: '계산 불가' }))
}

// 라운드 1: 평균의 60%에 가장 가까운 숫자
function calcRound1(answers: Answer[]): RoundResult[] {
  const nums = answers.map((a) => ({ id: a.playerId, n: Number(a.value) || 50 }))
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

// 라운드 2: 가장 적은 선택지 = 고득점
function calcRound2(answers: Answer[]): RoundResult[] {
  const counts: Record<string, number> = {}
  answers.forEach((a) => {
    const v = String(a.value)
    counts[v] = (counts[v] || 0) + 1
  })
  const minCount = Math.min(...Object.values(counts))

  return answers.map((a) => {
    const v = String(a.value)
    const isRare = counts[v] === minCount
    const score = isRare ? 100 : Math.max(0, 100 - (counts[v] - minCount) * 25)
    return {
      playerId: a.playerId,
      scoreDelta: score,
      detail: `${v} 선택 (${counts[v]}명) → ${score}점`,
    }
  })
}

// 라운드 3: 3.00초에 얼마나 가까운지
function calcRound3(answers: Answer[]): RoundResult[] {
  return answers.map((a) => {
    const ms = Number(a.value) || 0
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

  const ranked = [...players]
    .sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
    .map((p, i) => {
      const ratio = RATIO_TABLE[Math.min(i, RATIO_TABLE.length - 1)]
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
