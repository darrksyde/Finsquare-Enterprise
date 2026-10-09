import type { DuesCharge, DuesChargeState, DuesFrequency, DuesPlan } from "../types/dues.types"
/**
 * Pure dues scheduling. No React, no repositories — the backend must recompute and own the real
 * schedule; this exists so the UI can preview a plan and judge a charge against today.
 */
export const MS_PER_DAY = 86400000
export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
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
/**
 * Adds whole months, **clamped to the last day of the target month**.
 *
 * `Date.setMonth` overflows instead of clamping, so 31 January plus one month would become
 * 3 March and a plan starting on the 29th–31st would skip a month and repeat the next one
 * (a known defect in the contribution schedule — see `docs/README.md`). Dues must not repeat it.
 */
export function addMonths(date: Date, months: number): Date {
  const year = date.getFullYear()
  const month = date.getMonth() + months
  const day = date.getDate()
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, lastDay))
}
export function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12)
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
/** The calendar key a charge's period is stored under. */
export function periodKeyFor(date: Date, frequency: DuesFrequency): string {
  if (frequency === "Weekly") return weekKey(date)
  if (frequency === "Monthly" || frequency === "Quarterly") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
  }
  if (frequency === "Yearly") return String(date.getFullYear())
  return toISODate(date)
}
/** Whether a charge is paid, partly paid, overdue or still ahead of its due date. */
export function chargeState(expected: number, paid: number, dueDate: string, today: string): DuesChargeState {
  if (expected <= 0) return "Paid"
  if (paid >= expected) return "Paid"
  if (daysBetween(parseISODate(dueDate), parseISODate(today)) > 0) return "Overdue"
  return paid > 0 ? "Partially Paid" : "Pending"
}
/** The date the next charge falls due, stepping from the plan's start date. `null` = no schedule. */
export function nextDueDateFor(plan: DuesPlan, index: number): Date {
  const start = parseISODate(plan.startDate)
  switch (plan.frequency) {
    case "One-time":
      return start
    case "Daily":
      return addDays(start, index)
    case "Weekly":
      return addDays(start, index * 7)
    case "Monthly":
      return addMonths(start, index)
    case "Quarterly":
      return addMonths(start, index * 3)
    case "Yearly":
      return addYears(start, index)
    case "Custom":
      return addDays(start, index * (plan.customFrequency?.days ?? 30))
  }
}
/** Number of due dates shown ahead of today when a plan has no end date. */
export const DUES_HORIZON_DAYS = 365
/**
 * Builds the expected charge ledger for a plan.
 *
 * A plan without an end date runs indefinitely, so a rolling horizon (`DUES_HORIZON_DAYS`) is
 * generated for the demo; the backend generates each period on its schedule instead.
 */
export function generateCharges(
  plan: DuesPlan,
  participants: {
    id: string
    memberId: string
  }[],
  today: string,
  options: {
    maxPeriods?: number
    horizonDays?: number
  } = {},
): DuesCharge[] {
  const maxPeriods = options.maxPeriods ?? 400
  const horizonEnd = addDays(parseISODate(today), options.horizonDays ?? DUES_HORIZON_DAYS)
  const explicitEnd = plan.endDate ? parseISODate(plan.endDate) : null
  const dueDates: Date[] = []
  for (let index = 0; index < maxPeriods; index += 1) {
    const due = nextDueDateFor(plan, index)
    if (explicitEnd && daysBetween(explicitEnd, due) > 0) break
    if (!explicitEnd && daysBetween(horizonEnd, due) > 0) break
    dueDates.push(due)
    if (plan.frequency === "One-time") break
  }
  const charges: DuesCharge[] = []
  for (const participant of participants) {
    for (const due of dueDates) {
      const dueDate = toISODate(due)
      const periodKey = periodKeyFor(due, plan.frequency)
      charges.push({
        id: `${plan.id}:${participant.id}:${periodKey}`,
        organizationId: plan.organizationId,
        duesPlanId: plan.id,
        participantId: participant.id,
        memberId: participant.memberId,
        periodKey,
        dueDate,
        expectedAmount: plan.amount,
        paidAmount: 0,
        state: chargeState(plan.amount, 0, dueDate, today),
        lienState: "None",
      })
    }
  }
  return charges
}
/** A short human label for a plan's schedule. */
export function frequencyLabel(plan: Pick<DuesPlan, "frequency" | "customFrequency">): string {
  if (plan.frequency === "Custom") return plan.customFrequency?.label ?? "Custom"
  return plan.frequency === "One-time" ? "One-time" : plan.frequency
}
