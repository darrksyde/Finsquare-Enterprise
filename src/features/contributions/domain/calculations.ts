import type {
  Contribution,
  ContributionBalance,
  ContributionCommission,
  ContributionParticipant,
  ContributionPeriod,
  ContributionTransaction,
  ContributionWithdrawal,
  ContributionFrequency,
  PayoutBreakdown,
  PeriodState,
} from "../types/contribution.types"

/**
 * Pure contribution maths. No React, no repositories — the backend must recompute all of
 * this authoritatively; here it exists so the UI can preview and validate.
 */

export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export const MS_PER_DAY = 86_400_000

export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export function parseISODate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

export function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime()
  return Math.round((b - a) / MS_PER_DAY)
}

/** ISO-8601 week key, e.g. `2026-W40`. Weeks start on Monday. */
export function weekKey(date: Date): string {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = (target.getDay() + 6) % 7
  target.setDate(target.getDate() - day + 3)
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  const firstDay = (firstThursday.getDay() + 6) % 7
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3)
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * MS_PER_DAY))
  return `${target.getFullYear()}-W${String(week).padStart(2, "0")}`
}

export function periodKeyFor(date: Date, frequency: ContributionFrequency): string {
  if (frequency === "Weekly") return weekKey(date)
  if (frequency === "Monthly") return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
  return toISODate(date)
}

/** Number of days between two schedule steps; `null` when the frequency is not timed. */
export function stepDays(contribution: Contribution): number | null {
  if (!contribution.frequencyBased || contribution.frequency === "None") return null
  switch (contribution.frequency) {
    case "Daily":
      return 1
    case "Weekly":
      return 7
    case "Monthly":
      return 0
    case "Custom":
      return contribution.customFrequency?.days ?? null
    default:
      return null
  }
}

/**
 * Commission for a gross payout. Percentage is capped at 100 and the result never
 * exceeds the gross amount, so a payout can never be negative.
 */
export function commissionFor(
  commission: ContributionCommission,
  gross: number,
  fees = 0,
): number {
  if (gross <= 0) return 0
  const base = Math.max(0, gross - fees)
  switch (commission.model) {
    case "percentage": {
      const pct = Math.min(100, Math.max(0, commission.percentage ?? 0))
      return round2(Math.min(base, (base * pct) / 100))
    }
    case "fixed":
      return round2(Math.min(base, Math.max(0, commission.fixedAmount ?? 0)))
    default:
      return 0
  }
}

export function payoutBreakdown(
  gross: number,
  commission: number,
  fees: number,
): PayoutBreakdown {
  const safeGross = Math.max(0, round2(gross))
  const safeFees = Math.max(0, round2(fees))
  const safeCommission = Math.max(0, round2(commission))
  return {
    gross: safeGross,
    commission: safeCommission,
    fees: safeFees,
    net: Math.max(0, round2(safeGross - safeCommission - safeFees)),
  }
}

/**
 * Classifies a period from what was expected versus what was actually paid.
 * A missed contribution is never treated as a failed plan — see `lateCount`/`missedCount`.
 */
export function periodState(
  expected: number,
  paid: number,
  dueDate: string,
  today: string,
  graceDays = 0,
): PeriodState {
  if (expected <= 0) return "Paid"
  if (paid >= expected) return "Paid"
  const overdue = daysBetween(parseISODate(dueDate), parseISODate(today)) > graceDays
  if (paid > 0) return overdue ? "Late" : "Partially Paid"
  if (!overdue) return "Expected"
  return "Missed"
}

/** The date each period falls due, stepping from the contribution start date. */
export function periodDueDates(contribution: Contribution, count: number): Date[] {
  const start = parseISODate(contribution.startDate)
  const dates: Date[] = []
  const step = stepDays(contribution)
  for (let index = 0; index < count; index += 1) {
    if (contribution.frequency === "Monthly") dates.push(addMonths(start, index))
    else dates.push(addDays(start, (step ?? 30) * index))
  }
  return dates
}

/**
 * Builds the expected period ledger for a contribution. Periods in the past are judged
 * against recorded payments; future periods stay `Expected`.
 */
export function generatePeriods(
  contribution: Contribution,
  participants: ContributionParticipant[],
  transactions: ContributionTransaction[],
  today: string,
  options: { from?: string; to?: string; graceDays?: number; maxPeriods?: number } = {},
): ContributionPeriod[] {
  const step = stepDays(contribution)
  if (step === null) return []
  const maxPeriods = options.maxPeriods ?? 400
  const from = options.from ? parseISODate(options.from) : parseISODate(contribution.startDate)
  const to = options.to ? parseISODate(options.to) : new Date(parseISODate(today).getTime() + 365 * MS_PER_DAY)

  const periods: ContributionPeriod[] = []
  for (const participant of participants) {
    if (participant.contributionId !== contribution.id) continue
    const expected = participant.expectedAmount || contribution.fixedAmount || 0
    const paidByPeriod = new Map<string, number>()
    for (const tx of transactions) {
      if (tx.contributionId !== contribution.id) continue
      if (tx.type !== "Contribution" || tx.status !== "Completed") continue
      if (tx.participantId !== participant.id) continue
      const key = periodKeyFor(parseISODate(tx.date), contribution.frequency)
      paidByPeriod.set(key, round2((paidByPeriod.get(key) ?? 0) + tx.amount))
    }

    for (const duration of periodDueDates(contribution, maxPeriods)) {
      if (daysBetween(from, duration) < 0 || daysBetween(duration, to) < 0) continue
      if (contribution.endDate && daysBetween(parseISODate(contribution.endDate), duration) > 0) continue
      const dueDate = toISODate(duration)
      const periodKey = periodKeyFor(duration, contribution.frequency)
      const paidAmount = paidByPeriod.get(periodKey) ?? 0
      periods.push({
        id: `${contribution.id}:${participant.id}:${periodKey}`,
        organizationId: contribution.organizationId,
        contributionId: contribution.id,
        participantId: participant.id,
        periodKey,
        dueDate,
        expectedAmount: expected,
        paidAmount,
        state: periodState(expected, paidAmount, dueDate, today, options.graceDays ?? 0),
      })
    }
  }
  return periods
}

export function nextDueDate(periods: ContributionPeriod[], today: string): string | undefined {
  const upcoming = periods
    .filter((p) => p.state !== "Paid" && daysBetween(parseISODate(today), parseISODate(p.dueDate)) >= 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  if (upcoming.length) return upcoming[0].dueDate
  return periods.map((p) => p.dueDate).sort().pop()
}

const isCompletedCredit = (tx: ContributionTransaction) =>
  tx.type === "Contribution" && tx.status === "Completed" && tx.direction === "credit"

/**
 * Every figure the admin needs about one contribution's money:
 * total contributed, available balance, withdrawn, remaining/target, pending and commission.
 */
export function contributionBalance(
  contribution: Contribution,
  transactions: ContributionTransaction[],
  withdrawals: ContributionWithdrawal[],
): ContributionBalance {
  const scoped = transactions.filter((tx) => tx.contributionId === contribution.id)
  const totalContributed = round2(
    scoped.filter(isCompletedCredit).reduce((sum, tx) => sum + tx.amount, 0),
  )
  const pendingAmount = round2(
    scoped
      .filter((tx) => tx.type === "Contribution" && tx.status === "Pending" && tx.direction === "credit")
      .reduce((sum, tx) => sum + tx.amount, 0),
  )
  const settled = withdrawals.filter(
    (w) => w.contributionId === contribution.id && w.status === "Completed",
  )
  const totalWithdrawn = round2(settled.reduce((sum, w) => sum + w.grossAmount, 0))
  const commissionAccrued = round2(settled.reduce((sum, w) => sum + w.commission, 0))
  const availableBalance = round2(Math.max(0, totalContributed - totalWithdrawn))
  const netPayout = payoutBreakdown(
    availableBalance,
    commissionFor(contribution.commission, availableBalance),
    0,
  ).net

  const target = contribution.type === "Target" ? contribution.targetAmount : undefined

  return {
    contributionId: contribution.id,
    totalContributed,
    availableBalance,
    totalWithdrawn,
    amountRemaining: target === undefined ? undefined : round2(Math.max(0, target - totalContributed)),
    targetAmount: target,
    pendingAmount,
    commissionAccrued,
    netPayout,
  }
}

export type CollectionGranularity = "daily" | "weekly" | "monthly"

/** Collection history grouped by day, week or month — powers the reports tables. */
export function aggregateByPeriod(
  transactions: ContributionTransaction[],
  granularity: CollectionGranularity,
  scope: (tx: ContributionTransaction) => boolean = () => true,
): { key: string; collected: number; movements: number }[] {
  const buckets = new Map<string, { collected: number; movements: number }>()
  for (const tx of transactions) {
    if (!isCompletedCredit(tx) || !scope(tx)) continue
    const frequency: ContributionFrequency =
      granularity === "daily" ? "Daily" : granularity === "weekly" ? "Weekly" : "Monthly"
    const key = periodKeyFor(parseISODate(tx.date), frequency)
    const bucket = buckets.get(key) ?? { collected: 0, movements: 0 }
    bucket.collected = round2(bucket.collected + tx.amount)
    bucket.movements += 1
    buckets.set(key, bucket)
  }
  return [...buckets.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => a.key.localeCompare(b.key))
}

/** Progress towards a target, 0–100. Returns `undefined` when there is no target. */
export function targetProgress(contribution: Contribution, totalContributed: number): number | undefined {
  if (contribution.type !== "Target" || !contribution.targetAmount) return undefined
  return Math.min(100, (totalContributed / contribution.targetAmount) * 100)
}

/** What a participant is expected to have contributed so far, for outstanding/behind reporting. */
export function expectedToDate(
  contribution: Contribution,
  participant: ContributionParticipant,
  today: string,
): number {
  if (!contribution.frequencyBased) return participant.expectedAmount
  if (stepDays(contribution) === null) return 0
  const due = periodDueDates(contribution, 400).filter(
    (date) => daysBetween(date, parseISODate(today)) >= 0,
  )
  return round2(due.length * participant.expectedAmount)
}
