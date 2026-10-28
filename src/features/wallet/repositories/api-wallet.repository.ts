import { apiClient, endpoints } from "@/services/api"
import { ApiError } from "@/services/api/types"
import type { WalletDataset } from "../types/wallet.types"
import type { WalletRepository, WithdrawInput } from "./wallet.repository"

function notAvailable(feature: string): never {
  throw new ApiError(`${feature} is not available on the MFI backend yet.`, "not_found")
}

/**
 * API-backed wallet repository, wired to the MFI community wallet.
 *
 * The MFI backend has a single community wallet (balance + transaction ledger), whereas the
 * Enterprise model has multiple wallets, approvals, access controls and simulated balances. The
 * read side is mapped onto the real wallet; external transfers map onto `POST /wallet/withdraw`;
 * mutations the backend does not expose yet throw a user-safe error.
 */
export class ApiWalletRepository implements WalletRepository {
  async load(): Promise<WalletDataset> {
    return apiClient.get<WalletDataset>(endpoints.wallet.workspace)
  }

  async commit(): Promise<void> {
    return notAvailable("Wallet mutations")
  }

  async withdraw(input: WithdrawInput): Promise<{ reference: string }> {
    const response = await apiClient.post<{ reference?: string }>(endpoints.wallet.withdraw, {
      amount: input.amount,
      destinationAccountNumber: input.accountNumber,
      destinationBankCode: input.bankCode,
      destinationAccountName: input.accountName,
      narration: input.narration,
      transactionPin: input.pin,
    })
    return { reference: response.reference ?? "" }
  }

  subscribe(): () => void {
    // A real implementation would subscribe to a websocket or poll for invalidation.
    return () => {}
  }
}
