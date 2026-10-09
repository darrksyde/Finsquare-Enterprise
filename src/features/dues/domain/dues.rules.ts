import { chargeState, daysBetween, frequencyLabel, parseISODate, round2 } from "./schedule"
import type {
  DuesCharge,
  DuesDataset,
  DuesLienRules,
  DuesLienState,
  DuesParticipant,
  DuesParticipantState,
  DuesParticipantTotals,
  DuesPaymentStatus,
  DuesPlan,
  DuesPlanTotals,
  DuesSummary,
} from "../types/dues.types"
/**
 * Pure dues policy: what is owed, when a lien applies, and what a wallet recovery may take.
 * The backend recalculates all of it authoritatively — this exists so the UI can show the
 * position and so the mock cannot invent a figure of its own.
 */
export const outstandingOf = (charge: DuesCharge): number =>
  round2(Math.max(0, charge.expectedAmount - charge.paidAmount))
/** A charge is demandable money only once its due date has arrived. */
export const isDue = (charge: DuesCharge, today: string): boolean =>
  daysBetween(parseISODate(charge.dueDate), parseISODate(today)) >= 0
/** What is owed *now* on a charge — a future charge is not yet demandable. */
export const dueOutstandingOf = (charge: DuesCharge, today: string): number =>
  isDue(charge, today) ? outstandingOf(charge) : 0
/** True when a charge is unpaid past its due date plus the plan's grace period. */
export function lienApplies(charge: DuesCharge, plan: DuesPlan, today: string): boolean {
  if (outstandingOf(charge) <= 0) return false
  if (!plan.lien.enabled) return false
  // A paused plan stops taking on new claims; a closed one never will.
  if (plan.status !== "Active") return false
  return daysBetween(parseISODate(charge.dueDate), parseISODate(today)) > plan.lien.graceDays
}
/**
 * The lien state a charge should currently carry.
 *
 * A claim that was applied stays applied even if the plan is paused afterwards; it is only
 * `Recovered` once nothing is outstanding.
 */
export function effectiveLienState(charge: DuesCharge, plan: DuesPlan, today: string): DuesLienState {
  if (outstandingOf(charge) <= 0) return charge.lienAppliedAt ? "Recovered" : "None"
  if (!plan.lien.enabled) return "None"
  if (lienApplies(charge, plan, today) || charge.lienAppliedAt) {
    return charge.paidAmount > 0 ? "Partially recovered" : "Pending"
  }
  return "None"
}
/** A charge the automatic recovery may collect from a member's wallet. */
export function lienRecoverable(charge: DuesCharge, plan: DuesPlan, today: string): boolean {
  return lienApplies(charge, plan, today) && plan.lien.autoRecover
}
export const isAwaitingRecovery = (state: DuesLienState): boolean =>
  state === "Pending" || state === "Partially recovered"
/**
 * The one status an administrator reads: is it waiting on the wallet, overdue, partly paid,
 * paid, or still ahead of us. Derived, so it can never contradict the charge.
 */
export function chargeStatus(charge: DuesCharge, plan: DuesPlan, today: string): DuesPaymentStatus {
  if (isAwaitingRecovery(effectiveLienState(charge, plan, today))) return "Awaiting wallet recovery"
  switch (chargeState(charge.expectedAmount, charge.paidAmount, charge.dueDate, today)) {
    case "Paid":
      return "Paid"
    case "Overdue":
      return "Overdue"
    case "Partially Paid":
      return "Partially paid"
    default:
      return "Pending"
  }
}
/** Recomputes the derived fields of a charge. Never mutates the input. */
export function syncCharge(charge: DuesCharge, plan: DuesPlan, today: string): DuesCharge {
  const lienState = effectiveLienState(charge, plan, today)
  const lienAppliedAt = isAwaitingRecovery(lienState) && !charge.lienAppliedAt ? today : charge.lienAppliedAt
  return {
    ...charge,
    state: chargeState(charge.expectedAmount, charge.paidAmount, charge.dueDate, today),
    lienState,
    lienAppliedAt: lienAppliedAt === undefined ? undefined : lienAppliedAt,
  }
}
/** Applies `syncCharge` across a ledger, looking each charge's plan up by id. */
export function syncCharges(charges: DuesCharge[], plans: DuesPlan[], today: string): DuesCharge[] {
  const byId = new Map(plans.map((plan) => [plan.id, plan]))
  return charges.map((charge) => {
    const plan = byId.get(charge.duesPlanId)
    return plan ? syncCharge(charge, plan, today) : charge
  })
}
export interface RecoveryAllocationLine {
  charge: DuesCharge
  amount: number
}
/**
 * How much recovery takes from one wallet balance: oldest due first, capped at each charge's
 * outstanding amount, and never more than the balance. This is the "do not deduct more than the
 * amount owed" rule, and it makes partial recovery fall out of the arithmetic.
 */
export function recoveryAllocation(
  charges: DuesCharge[],
  availableBalance: number,
  memberPlans: Map<string, DuesPlan>,
  today: string,
): RecoveryAllocationLine[] {
  let remaining = round2(Math.max(0, availableBalance))
  const lines: RecoveryAllocationLine[] = []
  const ordered = [...charges].sort(
    (a, b) => a.dueDate.localeCompare(b.dueDate) || a.periodKey.localeCompare(b.periodKey),
  )
  for (const charge of ordered) {
    if (remaining <= 0) break
    const plan = memberPlans.get(charge.duesPlanId)
    if (!plan || !lienRecoverable(charge, plan, today)) continue
    const amount = round2(Math.min(outstandingOf(charge), remaining))
    if (amount <= 0) continue
    lines.push({ charge, amount })
    remaining = round2(remaining - amount)
  }
  return lines
}
/** Everything a participant's row shows, computed from their charges. */
export function participantTotals(
  participant: DuesParticipant,
  charges: DuesCharge[],
  plans: DuesPlan[],
  today: string,
): DuesParticipantTotals {
  const byId = new Map(plans.map((plan) => [plan.id, plan]))
  const mine = charges
    .filter((charge) => charge.participantId === participant.id)
    .map((charge) => {
      const plan = byId.get(charge.duesPlanId)
      return plan ? syncCharge(charge, plan, today) : charge
    })
  const expected = round2(mine.reduce((sum, charge) => sum + charge.expectedAmount, 0))
  const paid = round2(mine.reduce((sum, charge) => sum + charge.paidAmount, 0))
  const outstanding = round2(mine.reduce((sum, charge) => sum + dueOutstandingOf(charge, today), 0))
  const scheduled = round2(
    mine.filter((charge) => !isDue(charge, today)).reduce((sum, charge) => sum + outstandingOf(charge), 0),
  )
  const overdueAmount = round2(
    mine
      .filter((charge) => charge.state === "Overdue")
      .reduce((sum, charge) => sum + dueOutstandingOf(charge, today), 0),
  )
  const awaited = mine.filter((charge) => isAwaitingRecovery(charge.lienState))
  const due = mine.filter((charge) => isDue(charge, today))
  const state: DuesParticipantState =
    awaited.length > 0
      ? "Awaiting wallet recovery"
      : outstanding <= 0
        ? "Paid up"
        : paid > 0 || due.some((charge) => charge.paidAmount > 0)
          ? "Partially paid"
          : "Behind"
  return {
    participantId: participant.id,
    expected,
    paid,
    outstanding,
    scheduled,
    overdueAmount,
    dueCount: due.length,
    paidCount: mine.filter((charge) => outstandingOf(charge) <= 0).length,
    overdueCount: mine.filter((charge) => charge.state === "Overdue").length,
    awaitingRecoveryCount: awaited.length,
    state,
  }
}
export function planTotals(
  plan: DuesPlan,
  participants: DuesParticipant[],
  charges: DuesCharge[],
  today: string,
): DuesPlanTotals {
  const roster = participants.filter((participant) => participant.duesPlanId === plan.id)
  const ledger = charges
    .filter((charge) => charge.duesPlanId === plan.id)
    .map((charge) => syncCharge(charge, plan, today))
  const expected = round2(ledger.reduce((sum, charge) => sum + charge.expectedAmount, 0))
  const collected = round2(ledger.reduce((sum, charge) => sum + charge.paidAmount, 0))
  const outstanding = round2(ledger.reduce((sum, charge) => sum + dueOutstandingOf(charge, today), 0))
  const scheduled = round2(
    ledger.filter((charge) => !isDue(charge, today)).reduce((sum, charge) => sum + outstandingOf(charge), 0),
  )
  const overdue = round2(
    ledger
      .filter((charge) => charge.state === "Overdue")
      .reduce((sum, charge) => sum + dueOutstandingOf(charge, today), 0),
  )
  const totals = roster.map((participant) => participantTotals(participant, ledger, [plan], today))
  return {
    duesPlanId: plan.id,
    expected,
    collected,
    outstanding,
    scheduled,
    overdue,
    participants: roster.length,
    paidParticipants: totals.filter((total) => total.outstanding <= 0).length,
    unpaidParticipants: totals.filter((total) => total.outstanding > 0).length,
    awaitingRecovery: ledger.filter((charge) => isAwaitingRecovery(charge.lienState)).length,
  }
}
/** The whole module's dashboard figures. Outstanding means payable *now*, not scheduled ahead. */
export function summarizeDues(dataset: DuesDataset, today: string): DuesSummary {
  const synced = syncCharges(dataset.charges, dataset.plans, today)
  const outstanding = round2(synced.reduce((sum, charge) => sum + dueOutstandingOf(charge, today), 0))
  const overdue = round2(
    synced
      .filter((charge) => charge.state === "Overdue")
      .reduce((sum, charge) => sum + dueOutstandingOf(charge, today), 0),
  )
  const collected = round2(synced.reduce((sum, charge) => sum + charge.paidAmount, 0))
  const byParticipant = new Map<string, number>()
  for (const charge of synced) {
    byParticipant.set(
      charge.participantId,
      round2((byParticipant.get(charge.participantId) ?? 0) + dueOutstandingOf(charge, today)),
    )
  }
  const unpaidMembers = [...byParticipant.values()].filter((value) => value > 0).length
  return {
    totalCollected: collected,
    outstandingAmount: outstanding,
    overdueAmount: overdue,
    paidMembers: byParticipant.size - unpaidMembers,
    unpaidMembers,
    totalParticipants: byParticipant.size,
    activePlans: dataset.plans.filter((plan) => plan.status === "Active").length,
    awaitingRecovery: synced.filter((charge) => isAwaitingRecovery(charge.lienState)).length,
  }
}
/** What the plan demands from whom, in one line for a list. */
export function scopeLabel(plan: DuesPlan, participants: DuesParticipant[]): string {
  switch (plan.scope) {
    case "All":
      return "All members"
    case "Group":
      return plan.groupName ? `Group: ${plan.groupName}` : "Group"
    case "Branch":
      return plan.branchName ? `Branch: ${plan.branchName}` : "Branch"
    default: {
      const count = participants.filter((participant) => participant.duesPlanId === plan.id).length
      return `${count} selected ${count === 1 ? "member" : "members"}`
    }
  }
}
export function amountLabel(
  plan: Pick<DuesPlan, "amount" | "currency" | "frequency" | "customFrequency">,
  currency = "₦",
): string {
  return `${currency}${Math.round(plan.amount).toLocaleString("en-NG")} · ${frequencyLabel(plan)}`
}
/** How a plan's lien rules read to an administrator. */
export function lienRulesLabel(rules: DuesLienRules): string {
  if (!rules.enabled) return "No wallet lien — outstanding dues are tracked only"
  const grace =
    rules.graceDays === 0
      ? "as soon as it is due"
      : `${rules.graceDays} day${rules.graceDays === 1 ? "" : "s"} after the due date`
  const recovery = rules.autoRecover
    ? "recovered automatically from the wallet"
    : "recovered manually by an administrator"
  return `Wallet lien ${grace}, ${recovery}`
}
