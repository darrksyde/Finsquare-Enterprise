import type { WalletDataset } from "../types/wallet.types"

export interface WalletRepository {
  load(): Promise<WalletDataset>
  /** Replace named collections atomically; the backend equivalent is a transactional command. */
  commit(next: Partial<WalletDataset>): Promise<void>
  subscribe(listener: () => void): () => void
}
