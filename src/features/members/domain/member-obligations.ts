import type {
  Contribution,
  ContributionParticipant,
  ContributionPeriod,
} from "@/features/contributions/types/contribution.types"
import type { DuesCharge, DuesParticipant, DuesPlan } from "@/features/dues/types/dues.types"
import type { Loan } from "@/features/loans/types/loan.types"

/**
 * One thing a member owes, from whichever module raised it. The member profile is the only
 * place that sees all of them at once, so the shape stays flat and module-agnostic and keeps
 * enough context for a payment to be routed back to the right record.
 */
export interface MemberObligation {
  /** Unique across modules, so the same plan and loan cannot collide. */
  id: string
  kind: "Contribution" | "Loan repayment" | "Dues"
  /** What the administrator reads first: the plan or the loan product. */
  title: string
  /** The specific period or instalment being paid. */
  detail: string
  dueDate: string
  amount: number
  paid: number
  outstanding: number
  overdue: boolean
  contributionId?: string
  participantId?: string
  periodKey?: string
  loanId?: string
  duesPlanId?: string
  duesChargeId?: string
}

export interface MemberObligations {
  items: MemberObligation[]
  totalDue: number
  overdueCount: number
}

export interface MemberMoneySummary {
  contributionsPaid: number
  contributionBalance: number
  contributionsExpected: number
  missedContributions: number
  loansOutstanding: number
  activeLoans: number
  nextLoanDueDate?: string
  duesOutstanding: number
  overdueDues: number
  walletBalance: number
}

const round2 = (value: number) => Math.round(value * 100) / 100

/** `dueDate` is an ISO date in every module; compare on the date part so a timestamp still works. */
const isDue = (dueDate: string, today: string) => dueDate.slice(0, 10) <= today.slice(0, 10)

/**
 * The periods a payment can actually settle, one per key.
 *
 * `periodKeyFor` gives a frequency one key per period — a day, a week, a month — and the
 * contribution API settles a payment by that key. A monthly plan can still emit two due dates
 * inside the same month, which would surface as two rows resolving to one key: a duplicate React
 * key, one shared amount, and a second row that could never be cleared because the key it pays
 * was already settled. Keep the earliest due date per key, which is the one the ledger means.
 */
function settleablePeriods(periods: ContributionPeriod[]): ContributionPeriod[] {
  const byKey = new Map<string, ContributionPeriod>()
  for (const period of [...periods].sort((a, b) => a.dueDate.localeCompare(b.dueDate))) {
    const key = `${period.participantId}:${period.periodKey}`
    if (!byKey.has(key)) byKey.set(key, period)
  }
  return [...byKey.values()]
}

/**
 * Contribution periods the member owes. A period counts once it is due and not fully paid, so a
 * future period is not demandable money and an overpaid one is not a credit. A missed period is
 * deliberately still payable — a missed contribution is not a failed plan.
 */
export function contributionObligations(input: {
  memberId: string
  contributions: Contribution[]
  participants: ContributionParticipant[]
  periods: ContributionPeriod[]
  today: string
}): MemberObligation[] {
  const { memberId, contributions, participants, periods, today } = input
  const byId = new Map(contributions.map((contribution) => [contribution.id, contribution]))
  const obligations: MemberObligation[] = []

  for (const participant of participants) {
    if (participant.memberId !== memberId) continue
    const contribution = byId.get(participant.contributionId)
    if (!contribution) continue

    for (const period of settleablePeriods(periods)) {
      if (period.participantId !== participant.id) continue
      const outstanding = round2(period.expectedAmount - period.paidAmount)
      if (outstanding <= 0 || !isDue(period.dueDate, today)) continue
      obligations.push({
        id: `contribution:${period.participantId}:${period.periodKey}`,
        kind: "Contribution",
        title: contribution.name,
        detail: `Period ${period.periodKey}`,
        dueDate: period.dueDate,
        amount: period.expectedAmount,
        paid: period.paidAmount,
        outstanding,
        overdue: period.state === "Missed" || period.state === "Late",
        contributionId: contribution.id,
        participantId: participant.id,
        periodKey: period.periodKey,
      })
    }
  }

  return obligations
}

/**
 * Dues charges the member owes, from every plan they are on.
 *
 * A charge counts once it is due and not fully paid, exactly like a contribution period: a future
 * charge is scheduled money, not demandable money, and a partly paid one is still payable. The
 * charge's lien state is deliberately not shown here — the member profile says what is owed, and
 * the Dues module explains how it will be collected.
 */
export function duesObligations(input: {
  memberId: string
  plans: DuesPlan[]
  participants: DuesParticipant[]
  charges: DuesCharge[]
  today: string
}): MemberObligation[] {
  const { memberId, plans, participants, charges, today } = input
  const byId = new Map(plans.map((plan) => [plan.id, plan]))
  const mine = new Set(participants.filter((participant) => participant.memberId === memberId).map((p) => p.id))
  const obligations: MemberObligation[] = []

  for (const charge of charges) {
    if (!mine.has(charge.participantId)) continue
    const plan = byId.get(charge.duesPlanId)
    if (!plan) continue
    const outstanding = round2(charge.expectedAmount - charge.paidAmount)
    if (outstanding <= 0 || !isDue(charge.dueDate, today)) continue
    obligations.push({
      id: `dues:${charge.id}`,
      kind: "Dues",
      title: plan.name,
      detail: `Period ${charge.periodKey}`,
      dueDate: charge.dueDate,
      amount: charge.expectedAmount,
      paid: charge.paidAmount,
      outstanding,
      overdue: charge.state === "Overdue",
      duesPlanId: plan.id,
      duesChargeId: charge.id,
      participantId: charge.participantId,
      periodKey: charge.periodKey,
    })
  }

  return obligations
}

/**
 * Loan instalments the member owes. `Upcoming` instalments are scheduled, not yet demandable.
 *
 * The instalment's own shortfall is `amount - paid`. `RepaymentScheduleItem.balance` is the loan's
 * *running* balance after that instalment, so summing it would multiply the real debt.
 */
export function loanObligations(input: { memberId: string; loans: Loan[]; today: string }): MemberObligation[] {
  const { memberId, loans, today } = input
  const obligations: MemberObligation[] = []

  for (const loan of loans) {
    if (loan.borrower.memberId !== memberId) continue
    for (const item of loan.schedule) {
      const outstanding = round2(item.amount - item.paid)
      if (outstanding <= 0 || !isDue(item.dueDate, today)) continue
      obligations.push({
        id: `loan:${loan.id}:${item.no}`,
        kind: "Loan repayment",
        title: loan.productName,
        detail: `Instalment ${item.no} of ${loan.schedule.length} · ${loan.reference}`,
        dueDate: item.dueDate,
        amount: item.amount,
        paid: item.paid,
        outstanding,
        overdue: item.status === "Overdue",
        loanId: loan.id,
      })
    }
  }

  return obligations
}

/** Everything the member owes, oldest first — the order an administrator settles it in. */
export function memberObligations(input: {
  memberId: string
  contributions: Contribution[]
  participants: ContributionParticipant[]
  periods: ContributionPeriod[]
  loans: Loan[]
  duesPlans?: DuesPlan[]
  duesParticipants?: DuesParticipant[]
  duesCharges?: DuesCharge[]
  today: string
}): MemberObligations {
  const items = [
    ...contributionObligations(input),
    ...loanObligations(input),
    ...duesObligations({
      memberId: input.memberId,
      plans: input.duesPlans ?? [],
      participants: input.duesParticipants ?? [],
      charges: input.duesCharges ?? [],
      today: input.today,
    }),
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  return {
    items,
    totalDue: round2(items.reduce((sum, item) => sum + item.outstanding, 0)),
    overdueCount: items.filter((item) => item.overdue).length,
  }
}

/** The member's headline figures, from the modules that actually hold the money. */
export function memberMoneySummary(input: {
  memberId: string
  participants: ContributionParticipant[]
  periods: ContributionPeriod[]
  loans: Loan[]
  duesPlans?: DuesPlan[]
  duesParticipants?: DuesParticipant[]
  duesCharges?: DuesCharge[]
  walletBalance: number
  today: string
}): MemberMoneySummary {
  const { memberId, participants, periods, loans, walletBalance, today } = input
  const mine = participants.filter((participant) => participant.memberId === memberId)
  const myIds = new Set(mine.map((participant) => participant.id))

  let contributionsExpected = 0
  let missedContributions = 0
  // Counted over the same settleable set the obligations use, so "31 missed" and the list of what
  // is due always agree.
  for (const period of settleablePeriods(periods)) {
    if (!myIds.has(period.participantId)) continue
    contributionsExpected += period.expectedAmount
    if (period.state === "Missed") missedContributions += 1
  }

  const myLoans = loans.filter(
    (loan) => loan.borrower.memberId === memberId && loan.status !== "Completed" && loan.status !== "Written Off",
  )
  const next = myLoans
    .map((loan) => loan.nextDueDate)
    .filter((date): date is string => typeof date === "string" && !isDue(date, today))
    .sort()[0]

  const dues = duesObligations({
    memberId,
    plans: input.duesPlans ?? [],
    participants: input.duesParticipants ?? [],
    charges: input.duesCharges ?? [],
    today,
  })

  return {
    contributionsPaid: round2(mine.reduce((sum, participant) => sum + participant.totalContributed, 0)),
    contributionBalance: round2(mine.reduce((sum, participant) => sum + participant.availableBalance, 0)),
    contributionsExpected: round2(contributionsExpected),
    missedContributions,
    loansOutstanding: round2(myLoans.reduce((sum, loan) => sum + loan.outstanding, 0)),
    activeLoans: myLoans.length,
    nextLoanDueDate: next,
    duesOutstanding: round2(dues.reduce((sum, obligation) => sum + obligation.outstanding, 0)),
    overdueDues: dues.filter((obligation) => obligation.overdue).length,
    walletBalance: round2(walletBalance),
  }
}
