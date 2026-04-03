// ============================================================
// 게임팩 레지스트리 — 플랫폼의 중앙 허브
//
// 새 게임 추가하는 법:
//   1. src/packs/[game-id]/index.ts 파일 만들기
//   2. GamePack 인터페이스 구현
//   3. 아래 import + register 두 줄 추가
//   끝. 다른 코드는 아무것도 건드리지 않아도 됨.
// ============================================================

import type { GamePack, GamePackMeta } from '@/types/game-pack'
import { lunchSagiPack } from './lunch-sagi'

// ─────────────────────────────────────────
// 게임팩 등록 (여기에만 추가하면 됨)
// ─────────────────────────────────────────
const packs: GamePack[] = [
  lunchSagiPack,
  // Phase 2: gaegyeongJuPack,
  // Phase 2: sadarePack,
  // Phase 3: chosungPack,
  // Phase 3: wordChainPack,
]

// ─────────────────────────────────────────
// 레지스트리 API
// ─────────────────────────────────────────
const registry = new Map<string, GamePack>(packs.map((p) => [p.meta.id, p]))

export function getGamePack(id: string): GamePack {
  const pack = registry.get(id)
  if (!pack) throw new Error(`GamePack '${id}' not found`)
  return pack
}

export function getAllPacks(): GamePackMeta[] {
  return packs.map((p) => p.meta)
}

export function getPacksByCategory(category: GamePackMeta['category']): GamePackMeta[] {
  return packs.filter((p) => p.meta.category === category).map((p) => p.meta)
}

export function isPackAvailable(id: string): boolean {
  return registry.has(id)
}
