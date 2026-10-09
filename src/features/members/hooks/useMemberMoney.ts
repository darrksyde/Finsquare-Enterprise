import { useCallback, useMemo } from "react"
import { useContributions } from "@/features/contributions/hooks/useContributions"
import { CONTRIBUTION_ORG_ID } from "@/features/contributions/constants"
import { toISODate } from "@/features/contributions/domain/calculations"
import { useLoans } from "@/features/loans/hooks/useLoans"
import { useWallet } from "@/features/wallet/hooks/useWallet"
import { memberWalletFor } from "@/features/wallet/domain/wallet.rules"
import type { WalletCtx } from "@/features/wallet/components/WalletShell"
import { memberActivity } from "../domain/member-activity"
import { memberMoneySummary, memberObligations } from "../domain/member-obligations"
import { memberPaymentsService, type MemberPaymentInput, type MemberPaymentResult } from "../services/member-payments.service"
import type { AsyncStatus, View } from "@/types"

/**
 * Everything a member's money is doing, gathered from the modules that hold it.
 *
 * The member profile is the one screen that has to see contributions, loans and the member's own
 * wallet together, so the filtering and the totals live here rather than in the page — the page
 * stays presentational and the figures stay testable in `domain/member-*`.
 */
export function useMemberMoney(input: {
  memberId: string
  navigate: (view: View, id?: string) => void
  notify: (message: string) => void
}) {
  const { memberId } = input
  const contributions = useContributions(CONTRIBUTION_ORG_ID)
  const loans = useLoans()
  const wallet = useWallet()
  const today = toISODate(new Date())

  const dataset = contributions.data
  const loanData = loans.data
  const walletData = wallet.data

  const walletRow = useMemo(
    () => (walletData ? memberWalletFor(walletData.wallets, memberId) : undefined),
    [walletData, memberId],
  )

  const participants = useMemo(
    () => (dataset?.participants ?? []).filter((participant) => participant.memberId === memberId),
    [dataset, memberId],
  )
  const participantIds = useMemo(() => new Set(participants.map((participant) => participant.id)), [participants])

  /** The plans this member is on — not every plan in the organization. */
  const plans = useMemo(() => {
    const ids = new Set(participants.map((participant) => participant.contributionId))
    return (dataset?.contributions ?? []).filter((contribution) => ids.has(contribution.id))
  }, [dataset, participants])

  const periods = useMemo(
    () => (dataset?.periods ?? []).filter((period) => participantIds.has(period.participantId)),
    [dataset, participantIds],
  )
  const transactions = useMemo(
    () =>
      (dataset?.transactions ?? []).filter(
        (transaction) => transaction.participantId !== undefined && participantIds.has(transaction.participantId),
      ),
    [dataset, participantIds],
  )
  const memberLoans = useMemo(
    () => (loanData?.loans ?? []).filter((loan) => loan.borrower.memberId === memberId),
    [loanData, memberId],
  )
  const repayments = useMemo(() => {
    const ids = new Set(memberLoans.map((loan) => loan.id))
    return (loanData?.repayments ?? []).filter((repayment) => ids.has(repayment.loanId))
  }, [loanData, memberLoans])
  const walletTransactions = useMemo(
    () => (walletData?.transactions ?? []).filter((transaction) => transaction.walletId === walletRow?.id),
    [walletData, walletRow],
  )

  const obligations = useMemo(
    () =>
      memberObligations({
        memberId,
        contributions: dataset?.contributions ?? [],
        participants: dataset?.participants ?? [],
        periods: dataset?.periods ?? [],
        loans: loanData?.loans ?? [],
        today,
      }),
    [memberId, dataset, loanData, today],
  )

  const summary = useMemo(
    () =>
      memberMoneySummary({
        memberId,
        participants: dataset?.participants ?? [],
        periods: dataset?.periods ?? [],
        loans: loanData?.loans ?? [],
        walletBalance: walletRow?.availableBalance ?? 0,
        today,
      }),
    [memberId, dataset, loanData, walletRow, today],
  )

  const activity = useMemo(
    () =>
      memberActivity({
        transactions,
        repayments,
        walletTransactions,
        contributionNames: new Map((dataset?.contributions ?? []).map((contribution) => [contribution.id, contribution.name])),
      }),
    [transactions, repayments, walletTransactions, dataset],
  )

  const { retry: retryContributions } = contributions
  const { retry: retryLoans } = loans
  const { retry: retryWallet } = wallet
  const retry = useCallback(() => {
    retryContributions()
    retryLoans()
    retryWallet()
  }, [retryContributions, retryLoans, retryWallet])

  /**
   * Records what the member pays, across both modules, through one call. Refreshing all three
   * sources is deliberate: a payment changes a contribution balance, a loan balance and a wallet
   * balance at the same time.
   */
  const pay = useCallback(
    async (payment: Omit<MemberPaymentInput, "memberId">): Promise<MemberPaymentResult> => {
      const result = await memberPaymentsService.recordPayment(
        CONTRIBUTION_ORG_ID,
        { ...payment, memberId },
        contributions.ctx,
      )
      retry()
      return result
    },
    [memberId, contributions.ctx, retry],
  )

  const error = contributions.error ?? loans.error ?? wallet.error
  const status: AsyncStatus = error ? "error" : dataset && loanData && walletData ? "success" : "loading"

  const walletCtx = walletData ? ({ ...input, ...wallet, data: walletData } as WalletCtx) : null

  return {
    status,
    error,
    retry,
    today,
    plans,
    participants,
    periods,
    transactions,
    loans: memberLoans,
    repayments,
    wallet: walletRow,
    walletCtx,
    walletTransactions,
    obligations,
    summary,
    activity,
    can: contributions.can,
    mode: contributions.mode,
    environment: contributions.environment,
    pay,
  }
}
