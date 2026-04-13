// ============================================================
// 개경주 게임팩 — Phase 2 템플릿
// lunchSagiPack 구조를 그대로 복사해서 내용만 바꾸면 됨
// 등록: src/packs/index.ts에 import + packs 배열에 추가
// ============================================================

import type { GamePack, Answer, RoundResult, FinalResult, GameSettings, RoundConfig } from '@/types/game-pack'

// 개 목록 (5마리) — 각 개마다 숨겨진 스탯 존재
const DOGS = [
  { id: 1, name: '번개', emoji: '⚡', baseSpeed: 80 },
  { id: 2, name: '뚱이', emoji: '🐾', baseSpeed: 40 },
  { id: 3, name: '바람', emoji: '💨', baseSpeed: 70 },
  { id: 4, name: '복덩이', emoji: '🍀', baseSpeed: 55 },
  { id: 5, name: '막내', emoji: '🐶', baseSpeed: 60 },
]

// 경기마다 변수 주입 (날씨, 컨디션, 복병)
function generateRaceFactors() {
  return DOGS.map(dog => ({
    ...dog,
    finalSpeed: dog.baseSpeed + (Math.random() * 40 - 20), // ±20 랜덤
    condition: Math.random() > 0.8 ? 'upset' : 'normal',   // 20% 복병
  }))
}

export const gaegyeongJuPack: GamePack = {
  meta: {
    id: 'gaegyeong-ju',
    name: '개경주',
    description: '내가 고른 개가 1등으로 달려오면 이긴다',
    category: 'fun',
    minPlayers: 2,
    maxPlayers: 6,
    roundCount: 3,
    estimatedMinutes: 4,
    isPremium: false,   // Phase 2 출시 시 false, 이후 프리미엄 스킨 유료화
    emoji: '🐕',
  },

  getRoundConfig(roundNum: number, _settings: GameSettings): RoundConfig {
    return {
  roundNum,
  timeLimitSec: 15,
  gameType: 'timing' as const,
  title: `${roundNum}경기`,
  instruction: '달릴 개를 한 마리 고르세요. 결과는 운과 변수에 따라 결정됩니다.',
}
  },

  calculateRoundScore(answers: Answer[], _roundNum: number): RoundResult[] {
    const factors = generateRaceFactors()
    const winner = factors.sort((a, b) => b.finalSpeed - a.finalSpeed)[0]

    return answers.map(a => {
      const dogId = Number(a.value)
      const isWinner = dogId === winner.id
      return {
        playerId: a.playerId,
        scoreDelta: isWinner ? 100 : 0,
        detail: `선택: ${DOGS.find(d => d.id === dogId)?.name ?? '?'} / 1등: ${winner.name}`,
      }
    })
  },

  calculateFinalResult(
    scores: Record<string, number>,
    players: { id: string; nickname: string }[],
    settings: GameSettings
  ): FinalResult {
    const totalAmount = (settings.totalAmount as number) || 0
    const ratios = [0, 0, 0.2, 0.3, 0.5, 0.5]
    const ranked = [...players]
      .sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
      .map((p, i) => ({
        rank: i + 1,
        playerId: p.id,
        nickname: p.nickname,
        totalScore: scores[p.id] || 0,
        ratio: ratios[Math.min(i, ratios.length - 1)],
        amount: Math.round(totalAmount * ratios[Math.min(i, ratios.length - 1)]),
      }))
    return { rankings: ranked, totalAmount }
  },
}
