import type { ContributionTransaction } from "@/features/contributions/types/contribution.types"
import type { DuesTransaction } from "@/features/dues/types/dues.types"
import type { LoanRepayment } from "@/features/loans/types/loan.types"
import type { WalletTransaction } from "@/features/wallet/types/wallet.types"

/** One money movement on a member, whichever module recorded it. */
export interface MemberActivity {
  id: string
  at: string
  what: string
  detail: string
  amount: number
  direction: "credit" | "debit"
  source: "Contribution" | "Loan" | "Dues" | "Wallet"
  status: string
}

/**
 * The member's movements across the modules that hold their money, newest first. This is the
 * only place all of them appear together — each module's own ledger only knows its own rows.
 *
 * When the dues ledger is supplied it represents its own wallet deductions, so the wallet rows for
 * those same movements are dropped: one payment must not read as two rows.
 */
export function memberActivity(input: {
  transactions: ContributionTransaction[]
  repayments: LoanRepayment[]
  walletTransactions: WalletTransaction[]
  contributionNames: Map<string, string>
  duesTransactions?: DuesTransaction[]
  duesNames?: Map<string, string>
  limit?: number
}): MemberActivity[] {
  const {
    transactions,
    repayments,
    walletTransactions,
    contributionNames,
    duesTransactions,
    duesNames,
    limit = 40,
  } = input

  const duesRecorded = duesTransactions !== undefined

  const rows: MemberActivity[] = [
    ...transactions.map((tx) => ({
      id: `contribution:${tx.id}`,
      at: tx.date,
      what: contributionNames.get(tx.contributionId) ?? "Contribution",
      detail: `${tx.reference} · ${tx.method}`,
      amount: tx.amount,
      direction: "credit" as const,
      source: "Contribution" as const,
      status: tx.status,
    })),
    ...repayments.map((repayment) => ({
      id: `loan:${repayment.id}`,
      at: repayment.date,
      what: `Loan repayment · ${repayment.loanReference}`,
      detail: `${repayment.reference} · ${repayment.method}`,
      amount: repayment.amount,
      direction: "credit" as const,
      source: "Loan" as const,
      status: repayment.status,
    })),
    ...(duesTransactions ?? []).map((tx) => ({
      id: `dues:${tx.id}`,
      at: tx.date,
      what: duesNames?.get(tx.duesPlanId) ?? "Dues",
      detail: `${tx.reference} · ${tx.method.replace("_", " ")}${tx.periodKey ? ` · ${tx.periodKey}` : ""}`,
      amount: tx.amount,
      direction: "credit" as const,
      source: "Dues" as const,
      status: tx.status,
    })),
    ...walletTransactions
      .filter((tx) => !(duesRecorded && tx.type === "Dues"))
      .map((tx) => ({
        id: `wallet:${tx.id}`,
        at: tx.date,
        what: tx.description,
        detail: `${tx.reference} · ${tx.type}`,
        amount: tx.amount,
        direction: tx.direction,
        source: "Wallet" as const,
        status: tx.status,
      })),
  ]

  return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit)
}
