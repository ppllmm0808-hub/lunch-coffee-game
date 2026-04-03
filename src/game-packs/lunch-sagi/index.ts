// ============================================================
// 점심 사기 게임팩 — MVP 첫 번째 게임
// GamePack 인터페이스를 구현한 독립 모듈
// 이 파일을 건드려도 다른 게임에 영향 없음
// ============================================================

import { GamePack, Answer, RoundScore, FinalResult } from '../../lib/game-pack.types'

// 라운드별 설정
const ROUNDS = [
  {
    title: '숫자 예측',
    description: '1~100 사이 숫자를 고르세요. 모든 참가자 평균의 60%에 가장 가까운 사람이 이깁니다.',
    timeoutSeconds: 20,
  },
  {
    title: '다수결 반대',
    description: '가장 적은 사람이 고를 것 같은 동물을 선택하세요.',
    timeoutSeconds: 15,
  },
  {
    title: '타이밍 챌린지',
    description: '정확히 3.00초에 버튼을 누르세요.',
    timeoutSeconds: 10,
  },
]

// 분담 비율 테이블 (1등부터 꼴지까지)
const SHARE_RATIOS: Record<number, number> = {
  1: 0.00,
  2: 0.00,
  3: 0.20,
  4: 0.30,
  5: 0.50,
  6: 0.50,
}

export const lunchSagiPack: GamePack = {
  meta: {
    id: 'lunch-sagi',
    name: '점심 사기 게임',
    description: '3라운드 후 꼴지가 점심을 더 냅니다',
    category: 'cost',
    minPlayers: 2,
    maxPlayers: 6,
    roundCount: 3,
    estimatedMinutes: 3,
    isPremium: false,
    emoji: '🍱',
  },

  getRoundInstruction(round) {
    return ROUNDS[round - 1]
  },

  calculateRoundScore(answers, round) {
    if (round === 1) return calcRound1(answers)
    if (round === 2) return calcRound2(answers)
    if (round === 3) return calcRound3(answers)
    return []
  },

  calculateFinalResult(scores, players, totalAmountKrw) {
    const sorted = [...players].sort(
      (a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0)
    )

    const rankings: FinalResult['rankings'] = sorted.map((p, i) => {
      const rank = i + 1
      const ratio = SHARE_RATIOS[rank] ?? 0.50
      return {
        rank,
        playerId: p.id,
        nickname: p.nickname,
        totalScore: scores[p.id] ?? 0,
        shareRatio: ratio,
        amountKrw: Math.round(totalAmountKrw * ratio),
      }
    })

    // 남은 금액 보정 (반올림 오차 처리)
    const distributed = rankings.reduce((s, r) => s + r.amountKrw, 0)
    const diff = totalAmountKrw - distributed
    if (diff !== 0 && rankings.length > 0) {
      rankings[rankings.length - 1].amountKrw += diff
    }

    return { rankings }
  },

  getRoundReveal(answers, scores, round) {
    if (round === 1) {
      const nums = answers.map(a => Number(a.value.number))
      const avg = nums.reduce((s, n) => s + n, 0) / nums.length
      const target = avg * 0.6
      return {
        correctAnswer: `목표값: ${target.toFixed(1)}`,
        insight: `참가자 평균: ${avg.toFixed(1)}`,
      }
    }
    if (round === 2) {
      const counts: Record<string, number> = {}
      answers.forEach(a => {
        const c = String(a.value.choice)
        counts[c] = (counts[c] ?? 0) + 1
      })
      const rarest = Object.entries(counts).sort((a, b) => a[1] - b[1])[0]
      return {
        correctAnswer: `희귀 선택: ${rarest[0]} (${rarest[1]}명)`,
        insight: '가장 적게 선택된 항목이 정답',
      }
    }
    return {
      correctAnswer: '목표: 3.000초',
      insight: scores.map(s => s.reason).join(', '),
    }
  },
}

// ── 라운드별 점수 계산 함수 ───────────────────────────────

function calcRound1(answers: Answer[]): RoundScore[] {
  const nums = answers.map(a => ({ id: a.playerId, n: Number(a.value.number) }))
  const avg = nums.reduce((s, x) => s + x.n, 0) / nums.length
  const target = avg * 0.6

  return nums.map(({ id, n }) => {
    const diff = Math.abs(n - target)
    const delta = Math.max(0, Math.round(100 - diff * 3))
    return { playerId: id, delta, reason: `오차 ${diff.toFixed(1)}` }
  })
}

function calcRound2(answers: Answer[]): RoundScore[] {
  const counts: Record<string, number> = {}
  answers.forEach(a => {
    const c = String(a.value.choice)
    counts[c] = (counts[c] ?? 0) + 1
  })

  return answers.map(a => {
    const choice = String(a.value.choice)
    const count = counts[choice] ?? 1
    // 적게 선택될수록 높은 점수
    const delta = Math.round(100 / count)
    return { playerId: a.playerId, delta, reason: `${choice} (${count}명 선택)` }
  })
}

function calcRound3(answers: Answer[]): RoundScore[] {
  return answers.map(a => {
    const ms = Number(a.value.ms)
    const diff = Math.abs(ms - 3000)
    const delta = Math.max(0, Math.round(100 - diff / 30))
    return {
      playerId: a.playerId,
      delta,
      reason: `${(ms / 1000).toFixed(3)}초 (오차 ${(diff / 1000).toFixed(3)}초)`,
    }
  })
}
