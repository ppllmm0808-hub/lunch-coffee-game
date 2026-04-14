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

export const MINI_GAMES = [
  { id: 'card' as const, emoji: '🃏', title: '카드 게임', desc: '합이 19에 가장 가까운 사람이 이긴다' },
  { id: 'mole' as const, emoji: '🦔', title: '두더지 게임', desc: '1분 안에 두더지를 최대한 많이 잡아라!' },
  { id: 'timing' as const, emoji: '⏱️', title: '타이밍 챌린지', desc: '정확히 3.00초에 버튼 누르기' },
]

type GameType = 'card' | 'mole' | 'timing'

const ROUND_CONFIGS: Omit<RoundConfig, 'roundNum'>[] = [
  {
    timeLimitSec: 15,
    gameType: 'card',
    title: '카드 게임',
    instruction: '카드 2장을 받았습니다. 합이 19에 가장 가까운 사람이 이깁니다.\n카드 1장을 교체하거나, 그대로 확정할 수 있습니다.',
  },
  {
    timeLimitSec: 90,
    gameType: 'mole',
    title: '두더지 게임',
    instruction: '두더지가 나타나면 빠르게 탭하세요!\n⚠️ STOP 버튼을 누르는 순간 즉시 종료됩니다.\n실수로 눌러도 되돌릴 수 없어요!\n목표 시간을 넘기면 10초마다 -10점!\n신중하게, 하지만 빠르게!',
  },
  {
    timeLimitSec: 30,
    gameType: 'timing',
    title: '타이밍 챌린지',
    instruction: '정확히 3.00초에 버튼을 누르세요.',
  },
]

function getRatios(n: number): number[] {
  if (n === 2) return [0, 1.0]
  if (n === 3) return [0, 0.30, 0.70]
  const bottom = [0.50, 0.30, 0.20]
  const ratios = Array(n).fill(0)
  for (let i = 0; i < Math.min(bottom.length, n - 1); i++) {
    ratios[n - 1 - i] = bottom[i]
  }
  return ratios
}

function getRoundConfig(roundNum: number, settings: GameSettings): RoundConfig {
  const typeMap: Record<GameType, number> = { card: 0, mole: 1, timing: 2 }
  const gameType = settings.currentGameType as GameType | undefined
  const idx = gameType !== undefined && typeMap[gameType] !== undefined
    ? typeMap[gameType]
    : Math.min(roundNum - 1, ROUND_CONFIGS.length - 1)
  return { roundNum, ...ROUND_CONFIGS[idx] }
}

function detectGameType(answers: Answer[]): GameType | null {
  if (answers.length === 0) return null
  const first = answers[0].value as Record<string, unknown>
  if ('cards' in first) return 'card'
  if ('moleCount' in first) return 'mole'
  if ('ms' in first) return 'timing'
  return null
}

function calculateRoundScore(answers: Answer[], roundNum: number): RoundResult[] {
  const type = detectGameType(answers)
  if (type === 'card') return calcCard(answers)
  if (type === 'mole') return calcMole(answers)
  if (type === 'timing') return calcTiming(answers)
  if (roundNum === 1) return calcCard(answers)
  if (roundNum === 2) return calcMole(answers)
  return calcTiming(answers)
}

function calcCard(answers: Answer[]): RoundResult[] {
  const sums = answers.map((a) => {
    const v = a.value as Record<string, unknown>
    const finalCards = (v.finalCards ?? v.cards) as number[] | undefined
    const sum = (finalCards?.[0] ?? 0) + (finalCards?.[1] ?? 0)
    return { id: a.playerId, sum }
  })
  const target = 19
  const diffs = sums.map((x) => ({ ...x, diff: Math.abs(x.sum - target) }))
  const minDiff = Math.min(...diffs.map((x) => x.diff))

  return diffs.map(({ id, sum, diff }) => {
    const score = diff === minDiff ? 100 : Math.max(0, Math.round(100 - (diff - minDiff) * 10))
    return {
      playerId: id,
      scoreDelta: score,
      detail: `카드 합 ${sum} (목표 19, 오차 ${diff}) → ${score}점`,
    }
  })
}

function calcMole(answers: Answer[]): RoundResult[] {
  return answers.map((a) => {
    const v = a.value as Record<string, unknown>
    const moleCount = Number(v.moleCount ?? 0)
    const elapsedSec = Number(v.elapsedSec ?? 0)
    const targetSec = Number(v.targetSec ?? 30)
    const over = Math.max(0, elapsedSec - targetSec)

    if (over >= 15) {
      return {
        playerId: a.playerId,
        scoreDelta: 0,
        detail: `두더지 ${moleCount}마리 (${over}초 초과) → 0점`,
      }
    } else if (over >= 10) {
      return {
        playerId: a.playerId,
        scoreDelta: 50,
        detail: `두더지 ${moleCount}마리 (${over}초 초과) → 50점`,
      }
    } else if (over >= 5) {
      return {
        playerId: a.playerId,
        scoreDelta: 100,
        detail: `두더지 ${moleCount}마리 (${over}초 초과) → 100점`,
      }
    }

    const score = Math.max(0, moleCount * 10)
    return {
      playerId: a.playerId,
      scoreDelta: score,
      detail: `두더지 ${moleCount}마리 → ${score}점`,
    }
  })
}

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

  const roundResults = (settings.roundHistory as {
    title: string
    results: { playerId: string; detail: string }[]
  }[] | undefined)?.map(round => ({
    title: round.title,
    rankings: round.results
      .sort((a, b) => (scores[b.playerId] || 0) - (scores[a.playerId] || 0))
      .map(r => ({
        playerId: r.playerId,
        nickname: players.find(p => p.id === r.playerId)?.nickname ?? '',
        detail: r.detail,
      }))
  }))

  return { rankings: ranked, totalAmount, roundResults }
}

export const lunchSagiPack: GamePack = {
  meta,
  getRoundConfig,
  calculateRoundScore,
  calculateFinalResult,
}