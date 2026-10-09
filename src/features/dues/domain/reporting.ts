import { round2 } from "./schedule"
import { chargeStatus, dueOutstandingOf, outstandingOf, participantTotals, planTotals, syncCharge } from "./dues.rules"
import type {
  DuesCharge,
  DuesDataset,
  DuesParticipant,
  DuesPlan,
  DuesReportFilters,
  DuesReportRow,
  DuesTransaction,
} from "../types/dues.types"
/**
 * Dues reporting. Pure, so every figure on the central Reports page and the plan reports can be
 * unit-tested without a component. The backend must produce the same rows from the same records.
 *
 * A *group* filter is resolved to member ids by the caller (the same way Communications resolves a
 * selection), so this module needs no group repository.
 */
export const EMPTY_DUES_FILTERS: DuesReportFilters = {}
const inRange = (date: string, from?: string, to?: string) => {
  const day = date.slice(0, 10)
  if (from && day < from.slice(0, 10)) return false
  if (to && day > to.slice(0, 10)) return false
  return true
}
const inAmountRange = (amount: number, filters: DuesReportFilters) => {
  if (filters.minAmount !== undefined && amount < filters.minAmount) return false
  if (filters.maxAmount !== undefined && amount > filters.maxAmount) return false
  return true
}
interface Lookups {
  plans: Map<string, DuesPlan>
  participants: Map<string, DuesParticipant>
  groupedMemberIds?: Set<string>
}
function lookups(dataset: DuesDataset, memberIds?: string[]): Lookups {
  return {
    plans: new Map(dataset.plans.map((plan) => [plan.id, plan])),
    participants: new Map(dataset.participants.map((participant) => [participant.id, participant])),
    groupedMemberIds: memberIds ? new Set(memberIds) : undefined,
  }
}
/** The charges a report is about, after every filter has been applied. */
export function filterCharges(
  dataset: DuesDataset,
  filters: DuesReportFilters,
  today: string,
  memberIds?: string[],
): DuesCharge[] {
  const { plans, participants, groupedMemberIds } = lookups(dataset, memberIds)
  return dataset.charges
    .map((charge) => {
      const plan = plans.get(charge.duesPlanId)
      return plan ? syncCharge(charge, plan, today) : charge
    })
    .filter((charge) => {
      const plan = plans.get(charge.duesPlanId)
      if (!plan) return false
      if (filters.duesPlanId && charge.duesPlanId !== filters.duesPlanId) return false
      if (filters.memberId && charge.memberId !== filters.memberId) return false
      if (groupedMemberIds && !groupedMemberIds.has(charge.memberId)) return false
      const participant = participants.get(charge.participantId)
      if (filters.branchId && participant?.branchId !== filters.branchId) return false
      if (filters.status && filters.status !== "All" && chargeStatus(charge, plan, today) !== filters.status)
        return false
      if (!inRange(charge.dueDate, filters.from, filters.to)) return false
      // The amount range is about what is owed, so a charge that is not due yet is 0 here.
      if (!inAmountRange(dueOutstandingOf(charge, today), filters)) return false
      return true
    })
}
/** The dues movements a report is about. */
export function filterTransactions(
  dataset: DuesDataset,
  filters: DuesReportFilters,
  memberIds?: string[],
): DuesTransaction[] {
  const grouped = memberIds ? new Set(memberIds) : undefined
  const participantIds = filters.branchId
    ? new Set(
        dataset.participants
          .filter((participant) => participant.branchId === filters.branchId)
          .map((participant) => participant.id),
      )
    : undefined
  return dataset.transactions.filter((transaction) => {
    if (filters.duesPlanId && transaction.duesPlanId !== filters.duesPlanId) return false
    if (filters.memberId && transaction.memberId !== filters.memberId) return false
    if (grouped && (!transaction.memberId || !grouped.has(transaction.memberId))) return false
    if (participantIds && (!transaction.participantId || !participantIds.has(transaction.participantId))) return false
    if (filters.method && filters.method !== "All" && transaction.method !== filters.method) return false
    if (filters.type && filters.type !== "All" && transaction.type !== filters.type) return false
    if (
      filters.transactionStatus &&
      filters.transactionStatus !== "All" &&
      transaction.status !== filters.transactionStatus
    )
      return false
    if (!inRange(transaction.date, filters.from, filters.to)) return false
    if (!inAmountRange(transaction.amount, filters)) return false
    return true
  })
}
/** Money received per month — the collection history. */
export function collectionHistory(
  dataset: DuesDataset,
  filters: DuesReportFilters = EMPTY_DUES_FILTERS,
  memberIds?: string[],
): DuesReportRow[] {
  const received = filterTransactions(dataset, filters, memberIds).filter(
    (transaction) => transaction.status === "Completed" && transaction.direction === "credit",
  )
  const byMonth = new Map<
    string,
    {
      amount: number
      count: number
    }
  >()
  for (const transaction of received) {
    const month = transaction.date.slice(0, 7)
    const current = byMonth.get(month) ?? { amount: 0, count: 0 }
    byMonth.set(month, {
      amount: round2(current.amount + transaction.amount),
      count: current.count + 1,
    })
  }
  return [...byMonth.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, value]) => ({
      id: `collection:${month}`,
      label: month,
      period: month,
      amount: value.amount,
      paid: value.amount,
      outstanding: 0,
      count: value.count,
    }))
}
/** Every plan's collection position, and what is still out. */
export function planPerformance(dataset: DuesDataset, today: string): DuesReportRow[] {
  return dataset.plans.map((plan) => {
    const totals = planTotals(plan, dataset.participants, dataset.charges, today)
    return {
      id: `plan:${plan.id}`,
      label: plan.name,
      duesPlanId: plan.id,
      duesPlanName: plan.name,
      groupName: plan.groupName,
      branchName: plan.branchName,
      period: plan.startDate,
      amount: totals.collected,
      paid: totals.collected,
      outstanding: totals.outstanding,
      count: totals.participants,
      status: plan.status,
    }
  })
}
/** Who still owes, and how much — at participant level. */
export function outstandingRows(
  dataset: DuesDataset,
  filters: DuesReportFilters,
  today: string,
  memberIds?: string[],
): DuesReportRow[] {
  const plans = new Map(dataset.plans.map((plan) => [plan.id, plan]))
  const relevant = new Set(filterCharges(dataset, filters, today, memberIds).map((charge) => charge.participantId))
  return dataset.participants
    .filter((participant) => relevant.has(participant.id))
    .map((participant) => {
      const totals = participantTotals(participant, dataset.charges, [...plans.values()], today)
      return { participant, totals }
    })
    .filter(({ totals }) => totals.outstanding > 0)
    .map(({ participant, totals }) => {
      const plan = plans.get(participant.duesPlanId)
      return {
        id: `outstanding:${participant.id}`,
        label: participant.memberName,
        memberName: participant.memberName,
        duesPlanId: participant.duesPlanId,
        duesPlanName: plan?.name,
        branchName: participant.branchName,
        groupName: plan?.groupName,
        amount: totals.outstanding,
        paid: totals.paid,
        outstanding: totals.outstanding,
        status: totals.state,
        count: totals.overdueCount,
      }
    })
    .sort((a, b) => b.outstanding - a.outstanding)
}
/** Individual charges that are past their due date. */
export function overdueRows(
  dataset: DuesDataset,
  filters: DuesReportFilters,
  today: string,
  memberIds?: string[],
): DuesReportRow[] {
  const plans = new Map(dataset.plans.map((plan) => [plan.id, plan]))
  const participants = new Map(dataset.participants.map((participant) => [participant.id, participant]))
  const rows: DuesReportRow[] = []
  for (const charge of filterCharges(dataset, filters, today, memberIds)) {
    const plan = plans.get(charge.duesPlanId)
    if (!plan || charge.state !== "Overdue") continue
    const participant = participants.get(charge.participantId)
    rows.push({
      id: `overdue:${charge.id}`,
      label: participant?.memberName ?? charge.memberId,
      memberName: participant?.memberName,
      duesPlanId: charge.duesPlanId,
      duesPlanName: plan.name,
      branchName: participant?.branchName,
      period: charge.periodKey,
      dueDate: charge.dueDate,
      amount: outstandingOf(charge),
      paid: charge.paidAmount,
      outstanding: outstandingOf(charge),
      status: chargeStatus(charge, plan, today),
    })
  }
  return rows.sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
}
/** What the wallet actually took. */
export function walletRecoveryRows(
  dataset: DuesDataset,
  filters: DuesReportFilters = EMPTY_DUES_FILTERS,
  memberIds?: string[],
): DuesReportRow[] {
  const plans = new Map(dataset.plans.map((plan) => [plan.id, plan.name]))
  return filterTransactions(dataset, { ...filters, type: "Wallet recovery" }, memberIds).map((transaction) => ({
    id: `recovery:${transaction.id}`,
    label: transaction.reference,
    memberName: transaction.memberName,
    duesPlanId: transaction.duesPlanId,
    duesPlanName: plans.get(transaction.duesPlanId),
    period: transaction.periodKey,
    amount: transaction.amount,
    paid: transaction.amount,
    outstanding: 0,
    status: transaction.status,
    method: transaction.method,
  }))
}
/** Dues recorded by hand — cash or a bank transfer confirmed by an administrator. */
export function manualPaymentRows(
  dataset: DuesDataset,
  filters: DuesReportFilters = EMPTY_DUES_FILTERS,
  memberIds?: string[],
): DuesReportRow[] {
  const plans = new Map(dataset.plans.map((plan) => [plan.id, plan.name]))
  const manual = filterTransactions(dataset, filters, memberIds).filter(
    (transaction) => transaction.method === "cash" || transaction.method === "bank_transfer",
  )
  return manual.map((transaction) => ({
    id: `manual:${transaction.id}`,
    label: transaction.reference,
    memberName: transaction.memberName,
    duesPlanId: transaction.duesPlanId,
    duesPlanName: plans.get(transaction.duesPlanId),
    period: transaction.periodKey,
    amount: transaction.amount,
    paid: transaction.amount,
    outstanding: 0,
    status: transaction.status,
    method: transaction.method,
  }))
}
/** One member's whole dues history, newest first. */
export function memberPaymentHistory(dataset: DuesDataset, memberId: string): DuesReportRow[] {
  const plans = new Map(dataset.plans.map((plan) => [plan.id, plan]))
  return dataset.transactions
    .filter((transaction) => transaction.memberId === memberId)
    .map((transaction) => ({
      id: `history:${transaction.id}`,
      label: plans.get(transaction.duesPlanId)?.name ?? "Dues",
      duesPlanId: transaction.duesPlanId,
      duesPlanName: plans.get(transaction.duesPlanId)?.name,
      period: transaction.periodKey,
      dueDate: transaction.date,
      amount: transaction.amount,
      paid: transaction.amount,
      outstanding: 0,
      status: transaction.status,
      method: transaction.method,
    }))
    .sort((a, b) => (b.dueDate ?? "").localeCompare(a.dueDate ?? ""))
}
