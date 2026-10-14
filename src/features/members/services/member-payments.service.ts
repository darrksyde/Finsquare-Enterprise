import {
  contributionsService,
  type MutationContext,
} from "@/features/contributions/services/contributions.service"
import { duesService } from "@/features/dues/services/dues.service"
import { todayISO } from "@/features/loans/domain/calculations"
import { loansService } from "@/features/loans/services/loans.service"
import { walletServiceFor } from "@/features/wallet/services/wallet.service"
import type { ContributionPaymentMethodId } from "@/features/contributions/types/contribution.types"
import type { RepaymentMethod } from "@/features/loans/types/loan.types"
import type { MemberObligation } from "../domain/member-obligations"

/**
 * How the money arrived. `wallet` moves it out of the member's own wallet; the others record a
 * payment received outside the system.
 */
export type MemberPaymentMethod = "wallet" | "cash" | "bank_transfer"

const contributorMethod: Record<MemberPaymentMethod, ContributionPaymentMethodId> = {
  wallet: "wallet",
  cash: "cash",
  bank_transfer: "bank_transfer",
}

const repaymentMethod: Record<MemberPaymentMethod, RepaymentMethod> = {
  wallet: "Wallet debit",
  cash: "Cash",
  bank_transfer: "Bank transfer",
}

export interface MemberPaymentItem {
  obligation: MemberObligation
  amount: number
}

export interface MemberPaymentInput {
  memberId: string
  memberName: string
  items: MemberPaymentItem[]
  method: MemberPaymentMethod
  note?: string
}

export interface MemberPaymentResult {
  recorded: number
  total: number
  simulated: boolean
}

/**
 * Pays what a member owes, across every module that raised it.
 *
 * The wallet is debited exactly once per item. A contribution and a dues charge debit through
 * their own service, which owns that rule; a loan instalment debits here and is then recorded as
 * already paid. The paths cannot both take the money. As everywhere else, the backend must
 * re-check the wallet balance, the outstanding amounts and the environment before committing this.
 */
export class MemberPaymentsService {
  constructor(
    private contributions = contributionsService,
    private loans = loansService,
    private dues = duesService,
  ) {}

  async recordPayment(
    organizationId: string,
    input: MemberPaymentInput,
    ctx: MutationContext,
  ): Promise<MemberPaymentResult> {
    const date = todayISO()
    let total = 0
    let recorded = 0

    for (const { obligation, amount } of input.items) {
      if (amount <= 0) continue

      if (obligation.kind === "Contribution") {
        if (!obligation.contributionId || !obligation.participantId) continue
        const transaction = await this.contributions.recordPayment(
          organizationId,
          {
            contributionId: obligation.contributionId,
            participantId: obligation.participantId,
            periodKey: obligation.periodKey,
            amount,
            method: contributorMethod[input.method],
            note: input.note,
          },
          ctx,
        )
        if (!transaction) continue
      } else if (obligation.kind === "Dues") {
        if (!obligation.duesPlanId) continue
        // The dues service owns the rule that a wallet payment is debited before it is recorded,
        // so the wallet is never touched twice for the same obligation.
        const transaction = await this.dues.recordPayment(
          organizationId,
          {
            duesPlanId: obligation.duesPlanId,
            participantId: obligation.participantId ?? "",
            amount,
            method: input.method,
            chargeId: obligation.duesChargeId,
            note: input.note,
          },
          ctx,
        )
        if (!transaction) continue
      } else {
        if (!obligation.loanId) continue
        if (input.method === "wallet") {
          // The tenant is bound here because the wallet is the community's, not the app's active one.
          const wallet = await walletServiceFor(organizationId).ensureMemberWallet(
            { memberId: input.memberId, memberName: input.memberName },
            ctx.actor,
          )
          await walletServiceFor(organizationId).spend(
            {
              walletId: wallet.id,
              amount,
              type: "Loan Repayment",
              kind: "Withdrawal",
              description: `${obligation.title} — repayment`,
              reference: obligation.loanId,
              counterparty: input.memberName,
            },
            ctx.actor,
            ctx.mode,
          )
        }
        await this.loans.recordRepayment({
          loanId: obligation.loanId,
          amount,
          method: repaymentMethod[input.method],
          date,
          reference: "",
          note: input.note,
        })
      }

      total += amount
      recorded += 1
    }

    return { recorded, total: Math.round(total * 100) / 100, simulated: ctx.mode !== "live" }
  }
}

export const memberPaymentsService = new MemberPaymentsService()
