import { createWalletDataset } from "../mocks/wallet.mock"
import type { WalletDataset } from "../types/wallet.types"
import type { WalletRepository } from "./wallet.repository"

export function createMockWalletRepository(): WalletRepository {
  let data: WalletDataset = createWalletDataset()
  const listeners = new Set<() => void>()
  return {
    async load() {
      await new Promise((r) => setTimeout(r, 120))
      return data
    },
    async commit(next) {
      data = { ...data, ...next }
      listeners.forEach((l) => l())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
  }
}
