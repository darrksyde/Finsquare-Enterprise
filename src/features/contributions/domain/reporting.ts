import type {
  Contribution,
  ContributionDataset,
  ContributionParticipant,
  ContributionReportFilters,
  ContributionReportRow,
  ContributionTransaction,
  ContributionWithdrawal,
} from "../types/contribution.types"
import { aggregateByPeriod, contributionBalance, round2, type CollectionGranularity } from "./calculations"

/** Report projections over a contribution dataset. Pure aggregations — the UI only formats them. */

const within = (value: string | undefined, from?: string, to?: string) => {
  if (!value) return true
  const day = value.slice(0, 10)
  if (from && day < from) return false
  if (to && day > to) return false
  return true
}

/** The contribution-level part of a filter set, applied to a plan rather than a movement. */
function planMatches(contribution: Contribution, filters: ContributionReportFilters): boolean {
  if (filters.contributionId && contribution.id !== filters.contributionId) return false
  if (filters.type && filters.type !== "All" && contribution.type !== filters.type) return false
  if (filters.form && filters.form !== "All" && contribution.form !== filters.form) return false
  if (filters.groupId && contribution.groupId !== filters.groupId) return false
  if (filters.recipientKind && filters.recipientKind !== "All" && contribution.recipient.kind !== filters.recipientKind) return false
  return true
}

export function filterTransactions(
  dataset: ContributionDataset,
  filters: ContributionReportFilters,
): ContributionTransaction[] {
  const contributionById = new Map(dataset.contributions.map((c) => [c.id, c]))
  const participantById = new Map(dataset.participants.map((p) => [p.id, p]))
  return dataset.transactions.filter((tx) => {
    if (filters.contributionId && tx.contributionId !== filters.contributionId) return false
    if (filters.participantId && tx.participantId !== filters.participantId) return false
    if (filters.transactionType && filters.transactionType !== "All" && tx.type !== filters.transactionType) return false
    if (filters.status && filters.status !== "All" && tx.status !== filters.status) return false
    if (filters.method && filters.method !== "All" && tx.method !== filters.method) return false
    if (filters.minAmount !== undefined && tx.amount < filters.minAmount) return false
    if (filters.maxAmount !== undefined && tx.amount > filters.maxAmount) return false
    if (!within(tx.date, filters.from, filters.to)) return false

    const contribution = contributionById.get(tx.contributionId)
    if (contribution && !planMatches(contribution, filters)) return false
    if (filters.branchId) {
      const participant = tx.participantId ? participantById.get(tx.participantId) : undefined
      if (!participant || participant.branchId !== filters.branchId) return false
    }
    return true
  })
}

export function filterWithdrawals(
  dataset: ContributionDataset,
  filters: ContributionReportFilters,
): ContributionWithdrawal[] {
  const allowed = new Set(filterTransactions(dataset, filters).map((tx) => tx.contributionId))
  const scoped = filters.contributionId || filters.type || filters.form || filters.groupId || filters.recipientKind ? allowed : null
  return dataset.withdrawals.filter((w) => {
    if (scoped && !scoped.has(w.contributionId)) return false
    if (!within(w.requestedAt, filters.from, filters.to)) return false
    if (filters.minAmount !== undefined && w.grossAmount < filters.minAmount) return false
    if (filters.maxAmount !== undefined && w.grossAmount > filters.maxAmount) return false
    return true
  })
}

/** Contribution-by-contribution performance. */
export function contributionPerformance(
  dataset: ContributionDataset,
  filters: ContributionReportFilters = {},
): ContributionReportRow[] {
  return dataset.contributions.filter((c) => planMatches(c, filters)).map((contribution) => {
    const balance = contributionBalance(contribution, dataset.transactions, dataset.withdrawals)
    const participants = dataset.participants.filter((p) => p.contributionId === contribution.id)
    const missed = dataset.periods.filter((p) => p.contributionId === contribution.id && p.state === "Missed").length
    return {
      id: contribution.id,
      label: contribution.name,
      contributionId: contribution.id,
      contributionName: contribution.name,
      groupName: contribution.groupName,
      contributors: participants.length,
      collected: balance.totalContributed,
      withdrawn: balance.totalWithdrawn,
      commission: balance.commissionAccrued,
      netPayout: balance.netPayout,
      balance: balance.availableBalance,
      missed,
    }
  })
}

/** Group performance, rolled up from the contributions attached to each group. */
export function groupPerformance(dataset: ContributionDataset): ContributionReportRow[] {
  const rows = new Map<string, ContributionReportRow>()
  for (const row of contributionPerformance(dataset)) {
    const key = row.groupName ?? "No group"
    const current = rows.get(key) ?? {
      id: key,
      label: key,
      groupName: key,
      contributors: 0,
      collected: 0,
      withdrawn: 0,
      commission: 0,
      netPayout: 0,
      balance: 0,
      missed: 0,
    }
    rows.set(key, {
      ...current,
      contributors: (current.contributors ?? 0) + (row.contributors ?? 0),
      collected: round2(current.collected + row.collected),
      withdrawn: round2(current.withdrawn + row.withdrawn),
      commission: round2(current.commission + row.commission),
      netPayout: round2(current.netPayout + row.netPayout),
      balance: round2(current.balance + row.balance),
      missed: (current.missed ?? 0) + (row.missed ?? 0),
    })
  }
  return [...rows.values()].sort((a, b) => b.collected - a.collected)
}

export function collectionHistory(
  dataset: ContributionDataset,
  granularity: CollectionGranularity,
  filters: ContributionReportFilters = {},
): ContributionReportRow[] {
  const allowed = new Set(filterTransactions(dataset, filters).map((tx) => tx.id))
  const buckets = aggregateByPeriod(dataset.transactions, granularity, (tx) => allowed.has(tx.id))
  return buckets.map((bucket) => ({
    id: bucket.key,
    label: bucket.key,
    period: bucket.key,
    collected: bucket.collected,
    withdrawn: 0,
    commission: 0,
    netPayout: 0,
    balance: 0,
    contributors: bucket.movements,
  }))
}

/** Commission and net payout taken on each completed withdrawal. */
export function commissionReport(dataset: ContributionDataset, filters: ContributionReportFilters = {}): ContributionReportRow[] {
  const nameById = new Map(dataset.contributions.map((c) => [c.id, c.name]))
  return filterWithdrawals(dataset, filters)
    .filter((w) => w.status === "Completed")
    .map((w) => ({
      id: w.id,
      label: w.reference,
      contributionId: w.contributionId,
      contributionName: nameById.get(w.contributionId),
      period: w.completedAt?.slice(0, 10),
      collected: w.grossAmount,
      withdrawn: w.grossAmount,
      commission: w.commission,
      netPayout: w.netPayout,
      balance: 0,
    }))
}

export function pendingPayoutRows(dataset: ContributionDataset): ContributionReportRow[] {
  const nameById = new Map(dataset.contributions.map((c) => [c.id, c.name]))
  return dataset.withdrawals
    .filter((w) => w.status === "Pending approval" || w.status === "Approved" || w.status === "Scheduled")
    .map((w) => ({
      id: w.id,
      label: w.reference,
      contributionId: w.contributionId,
      contributionName: nameById.get(w.contributionId),
      period: w.scheduledFor ?? w.requestedAt.slice(0, 10),
      collected: w.grossAmount,
      withdrawn: 0,
      commission: w.commission,
      netPayout: w.netPayout,
      balance: 0,
    }))
}

export function missedContributionRows(dataset: ContributionDataset): ContributionReportRow[] {
  const participantById = new Map(dataset.participants.map((p) => [p.id, p]))
  const nameById = new Map(dataset.contributions.map((c) => [c.id, c.name]))
  return dataset.periods
    .filter((p) => p.state === "Missed" || p.state === "Late" || p.state === "Partially Paid")
    .map((p) => ({
      id: p.id,
      label: participantById.get(p.participantId)?.memberName ?? "Unknown",
      contributionId: p.contributionId,
      contributionName: nameById.get(p.contributionId),
      period: p.periodKey,
      collected: p.paidAmount,
      withdrawn: 0,
      commission: 0,
      netPayout: 0,
      balance: round2(p.expectedAmount - p.paidAmount),
      missed: p.state === "Missed" ? 1 : 0,
    }))
}

/** One contributor's full contribution history. */
export function participantHistory(dataset: ContributionDataset, participantId: string): {
  participant?: ContributionParticipant
  contribution?: Contribution
  transactions: ContributionTransaction[]
  outstanding: number
} {
  const participant = dataset.participants.find((p) => p.id === participantId)
  const contribution = participant
    ? dataset.contributions.find((c) => c.id === participant.contributionId)
    : undefined
  const transactions = dataset.transactions
    .filter((tx) => tx.participantId === participantId)
    .sort((a, b) => b.date.localeCompare(a.date))
  const outstanding = dataset.periods
    .filter((p) => p.participantId === participantId && p.state !== "Paid")
    .reduce((sum, p) => sum + Math.max(0, p.expectedAmount - p.paidAmount), 0)
  return { participant, contribution, transactions, outstanding: round2(outstanding) }
}

/** All contributors with their contribution history summary. */
export function contributorSummary(
  dataset: ContributionDataset,
  filters: ContributionReportFilters = {},
): {
  participant: ContributionParticipant
  contribution?: Contribution
  outstanding: number
}[] {
  const byId = new Map(dataset.contributions.map((c) => [c.id, c]))
  return dataset.participants
    .filter((participant) => filters.participantId ? participant.id === filters.participantId : true)
    .filter((participant) => {
      const contribution = byId.get(participant.contributionId)
      return contribution ? planMatches(contribution, filters) : true
    })
    .map((participant) => ({
      participant,
      contribution: dataset.contributions.find((c) => c.id === participant.contributionId),
      outstanding: round2(
        dataset.periods
          .filter((p) => p.participantId === participant.id && p.state !== "Paid")
          .reduce((sum, p) => sum + Math.max(0, p.expectedAmount - p.paidAmount), 0),
      ),
    }))
    .sort((a, b) => b.participant.totalContributed - a.participant.totalContributed)
}
