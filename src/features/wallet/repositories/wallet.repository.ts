import type { WalletDataset } from "../types/wallet.types"

export interface WithdrawInput {
  walletId: string
  amount: number
  accountNumber: string
  bankCode: string
  accountName: string
  narration: string
  pin: string
}

export interface WalletRepository {
  load(): Promise<WalletDataset>
  /** Replace named collections atomically; the backend equivalent is a transactional command. */
  commit(next: Partial<WalletDataset>): Promise<void>
  /** Authorize an external bank transfer out of the community wallet. */
  withdraw(input: WithdrawInput): Promise<{ reference: string }>
  subscribe(listener: () => void): () => void
}
