// ============================================================
// GamePack 인터페이스 — 플랫폼 확장성의 핵심
// 새 게임 추가 = 이 인터페이스 구현 + registry에 등록
// ============================================================

export type GameCategory = 'fun' | 'battle' | 'psych' | 'cost'

export interface GamePackMeta {
  id: string                    // 'lunch-sagi', 'gaegyeong-ju', 'chosung'
  name: string                  // '점심 사기 게임'
  description: string           // '꼴찌가 점심 더 낸다'
  category: GameCategory
  minPlayers: number            // 최소 2명
  maxPlayers: number            // 최대 6명 (나중에 늘릴 수 있음)
  roundCount: number            // 기본 3라운드
  estimatedMinutes: number      // 예상 소요 시간
  isPremium: boolean            // 나중에 유료화 여부
  emoji: string                 // '🍱'
}

export interface RoundConfig {
  roundNum: number              // 1, 2, 3
  timeLimitSec: number          // 라운드당 제한 시간
  title: string                 // 'Round 1 — 숫자 예측'
  instruction: string           // 플레이어에게 보여줄 설명
}

// 플레이어가 제출하는 답변 — 게임마다 value 형태가 다름
export interface Answer {
  playerId: string
  roomCode: string
  roundNum: number
  value: unknown                // 게임별 자유: number | string | object
  submittedAt: string
}

// 라운드 결과 계산 후 반환
export interface RoundResult {
  playerId: string
  scoreDelta: number            // 이번 라운드에서 얻은 점수
  detail: string                // '오차 3.2 → 85점'
}

// 최종 결과 (점심값 분담 등)
export interface FinalResult {
  rankings: {
    rank: number
    playerId: string
    nickname: string
    totalScore: number
    ratio: number               // 0.0 ~ 1.0 (분담 비율)
    amount: number              // 실제 금액
  }[]
  totalAmount: number
}

// 게임 설정 (방장이 변경 가능)
export interface GameSettings {
  totalAmount?: number          // 점심 금액
  roundCount?: number           // 라운드 수 (3 or 5)
  timeLimitSec?: number         // 시간 제한 커스텀
  [key: string]: unknown        // 게임별 추가 설정
}

// ============================================================
// GamePack 인터페이스 — 모든 게임이 이것을 구현
// ============================================================
export interface GamePack {
  meta: GamePackMeta

  // 라운드 설정 생성 (라운드마다 다른 게임 유형 지원)
  getRoundConfig(roundNum: number, settings: GameSettings): RoundConfig

  // 서버에서 점수 계산 (절대 클라이언트에서 하면 안 됨)
  calculateRoundScore(answers: Answer[], roundNum: number): RoundResult[]

  // 최종 결과 계산
  calculateFinalResult(
    scores: Record<string, number>,
    players: { id: string; nickname: string }[],
    settings: GameSettings
  ): FinalResult
}

// ============================================================
// 게임 상태 타입 (Supabase rooms 테이블과 1:1 매핑)
// ============================================================
export type RoomStatus = 'waiting' | 'playing' | 'round_end' | 'finished'

export interface Room {
  id: string
  code: string                  // 'ABC123' — QR에 들어가는 코드
  gamePackId: string
  hostName: string
  status: RoomStatus
  currentRound: number
  maxRounds: number
  settings: GameSettings
  createdAt: string
}

export interface Player {
  id: string
  roomCode: string
  nickname: string
  score: number
  isHost: boolean
  joinedAt: string
}
