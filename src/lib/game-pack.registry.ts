// ============================================================
// 게임팩 레지스트리
// 새 게임 추가 = import 하나 + register 한 줄
// ============================================================

import { GamePack } from './game-pack.types'
import { lunchSagiPack } from '../game-packs/lunch-sagi'
// import { gaegyeongJuPack } from '../game-packs/gaegyeong-ju'  ← Phase 2
// import { chosungPack }      from '../game-packs/chosung'      ← Phase 3

const packs: Map<string, GamePack> = new Map()

function register(pack: GamePack) {
  packs.set(pack.meta.id, pack)
}

// ← 여기에만 추가하면 플랫폼 전체에 반영됨
register(lunchSagiPack)
// register(gaegyeongJuPack)
// register(chosungPack)

export const GamePackRegistry = {
  get(id: string): GamePack | undefined {
    return packs.get(id)
  },

  getOrThrow(id: string): GamePack {
    const pack = packs.get(id)
    if (!pack) throw new Error(`GamePack not found: ${id}`)
    return pack
  },

  getAll(): GamePack[] {
    return Array.from(packs.values())
  },

  getByCategory(category: GamePack['meta']['category']): GamePack[] {
    return Array.from(packs.values()).filter(p => p.meta.category === category)
  },

  getFree(): GamePack[] {
    return Array.from(packs.values()).filter(p => !p.meta.isPremium)
  },
}
