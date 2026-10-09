import { describe, expect, it } from "vitest"
import { memberActivity } from "./member-activity"
import type { ContributionTransaction } from "@/features/contributions/types/contribution.types"
import type { LoanRepayment } from "@/features/loans/types/loan.types"
import type { WalletTransaction } from "@/features/wallet/types/wallet.types"

const contributionTx = (overrides: Partial<ContributionTransaction> = {}): ContributionTransaction =>
  ({
    id: "cttx-1",
    reference: "CTR-123456",
    contributionId: "cont-ajo",
    participantId: "cont-ajo:LFC-002481",
    type: "Contribution",
    method: "cash",
    amount: 2_000,
    date: "2026-03-10T09:00:00.000Z",
    status: "Completed",
    ...overrides,
  }) as ContributionTransaction

const repayment = (overrides: Partial<LoanRepayment> = {}): LoanRepayment =>
  ({
    id: "rp-1",
    loanId: "loan-1",
    loanReference: "LN-5001",
    borrowerName: "Adewale Johnson",
    amount: 100_000,
    method: "Cash",
    date: "2026-03-12T09:00:00.000Z",
    reference: "RPY001",
    status: "Confirmed",
    ...overrides,
  }) as LoanRepayment

const walletTx = (overrides: Partial<WalletTransaction> = {}): WalletTransaction =>
  ({
    id: "wtx-1",
    reference: "WTX-1",
    date: "2026-03-11T09:00:00.000Z",
    description: "Wallet funded by bank transfer",
    type: "Funding",
    walletId: "w-member-1",
    amount: 50_000,
    direction: "credit",
    status: "Completed",
    ...overrides,
  }) as WalletTransaction

describe("member activity", () => {
  it("merges the three ledgers, newest first", () => {
    const rows = memberActivity({
      transactions: [contributionTx()],
      repayments: [repayment()],
      walletTransactions: [walletTx()],
      contributionNames: new Map([["cont-ajo", "Ikeja Daily Ajo"]]),
    })
    expect(rows.map((row) => row.source)).toEqual(["Loan", "Wallet", "Contribution"])
    expect(rows[2].what).toBe("Ikeja Daily Ajo")
  })

  it("keeps the wallet direction and names the loan it belongs to", () => {
    const rows = memberActivity({
      transactions: [],
      repayments: [repayment()],
      walletTransactions: [walletTx({ direction: "debit", type: "Contribution" })],
      contributionNames: new Map(),
    })
    expect(rows.find((row) => row.source === "Wallet")?.direction).toBe("debit")
    expect(rows.find((row) => row.source === "Loan")?.what).toContain("LN-5001")
  })

  it("honours the limit", () => {
    const rows = memberActivity({
      transactions: [contributionTx({ id: "a" }), contributionTx({ id: "b" })],
      repayments: [repayment()],
      walletTransactions: [],
      contributionNames: new Map(),
      limit: 2,
    })
    expect(rows).toHaveLength(2)
  })

  it("falls back to a generic label when a plan name is unknown", () => {
    const rows = memberActivity({
      transactions: [contributionTx()],
      repayments: [],
      walletTransactions: [],
      contributionNames: new Map(),
    })
    expect(rows[0].what).toBe("Contribution")
  })
})
