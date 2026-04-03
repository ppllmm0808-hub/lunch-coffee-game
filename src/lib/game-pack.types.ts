// ============================================================
// 게임팩 인터페이스 — 플랫폼의 핵심
// 모든 게임은 이 인터페이스를 구현해야 합니다.
// 새 게임 추가 = 이 인터페이스를 구현한 파일 하나 추가
// ============================================================

export type GameCategory = 'fun' | 'battle' | 'psych' | 'cost'

export interface GamePackMeta {
  id: string                  // 'lunch-sagi', 'gaegyeong-ju'
  name: string                // '점심 사기 게임'
  description: string         // 한 줄 설명
  category: GameCategory
  minPlayers: number
  maxPlayers: number
  roundCount: number
  estimatedMinutes: number
  isPremium: boolean
  emoji: string               // '🍱'
}

// 각 라운드에서 플레이어가 제출하는 답변
// value는 게임마다 형태가 다름 → jsonb로 저장
export interface Answer {
  playerId: string
  value: Record<string, unknown>  // { number: 42 } or { choice: '🦊' }
  submittedAt: number             // timestamp ms
}

// 라운드 점수 계산 결과
export interface RoundScore {
  playerId: string
  delta: number       // 이번 라운드에서 얻은 점수
  reason: string      // '목표값에 가장 가까움'
}

// 최종 결과 (순위 + 분담 비율)
export interface FinalResult {
  rankings: {
    rank: number
    playerId: string
    nickname: string
    totalScore: number
    shareRatio: number    // 0.0 ~ 1.0 (점심값 분담 비율)
    amountKrw: number     // 실제 금액
  }[]
}

// ============================================================
// GamePack 인터페이스 — 모든 게임이 구현해야 함
// ============================================================
export interface GamePack {
  meta: GamePackMeta

  // 라운드 지시문 (화면에 표시)
  getRoundInstruction(round: number): {
    title: string
    description: string
    timeoutSeconds: number
  }

  // 서버에서 점수 계산 (클라이언트에서 하면 부정행위 가능)
  calculateRoundScore(answers: Answer[], round: number): RoundScore[]

  // 최종 결과 계산
  calculateFinalResult(
    scores: Record<string, number>,  // playerId → totalScore
    players: { id: string; nickname: string }[],
    totalAmountKrw: number
  ): FinalResult

  // 라운드 결과 공개 메시지
  getRoundReveal(answers: Answer[], scores: RoundScore[], round: number): {
    correctAnswer: string
    insight: string
  }
}
