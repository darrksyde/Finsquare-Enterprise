import type {
  Contribution,
  ContributionDataset,
  ContributionForm,
  ContributionPaymentMethod,
  ContributionPaymentMethodId,
  ContributionRecipient,
  ContributionSchedule,
  ContributionSummary,
  ContributionWithdrawal,
  ParticipantScope,
} from "../types/contribution.types"
import {
  commissionFor,
  contributionBalance,
  generatePeriods,
  nextDueDate,
  stepDays,
  toISODate,
} from "./calculations"

/**
 * Contribution policy: who holds the money, when commission applies, when a public link
 * is live and when a payout needs a second approver. Pure functions — no I/O.
 */

export const PAYMENT_METHOD_CATALOG: ContributionPaymentMethod[] = [
  { id: "wallet", label: "Wallet", enabled: true, description: "Paid from a FinSquare wallet balance." },
  { id: "bank_transfer", label: "Bank transfer", enabled: true, description: "Contributor transfers from their own bank." },
  { id: "payment_link", label: "Payment link", enabled: true, description: "Share a link the contributor pays through." },
  { id: "cash", label: "Cash / manual", enabled: true, description: "Recorded by an administrator at the counter." },
  { id: "bank_account", label: "Bank-backed account", enabled: true, description: "Collected into the organization's bank-backed account." },
]

export function paymentMethodsFor(ids: ContributionPaymentMethodId[]): ContributionPaymentMethod[] {
  return PAYMENT_METHOD_CATALOG.filter((method) => ids.includes(method.id)).map((method) => ({ ...method }))
}

export function paymentMethodLabel(id: ContributionPaymentMethodId): string {
  return PAYMENT_METHOD_CATALOG.find((method) => method.id === id)?.label ?? id
}

/** Commission models an administrator can choose, with the wording shown in the UI. */
export const COMMISSION_MODEL_OPTIONS: { id: Contribution["commission"]["model"]; label: string; description: string }[] = [
  { id: "none", label: "No commission", description: "The full balance is paid out." },
  { id: "percentage", label: "Percentage of payout", description: "A share of the gross balance is deducted at payout." },
  { id: "fixed", label: "Fixed amount per payout", description: "A flat fee is deducted from each payout." },
]

export function commissionModelLabel(model: Contribution["commission"]["model"]): string {
  return COMMISSION_MODEL_OPTIONS.find((option) => option.id === model)?.label ?? model
}


export function recipientLabel(recipient: ContributionRecipient): string {
  if (recipient.label) return recipient.label
  if (recipient.kind === "organization") return `Organization account${recipient.accountName ? `: ${recipient.accountName}` : ""}`
  if (recipient.kind === "contributor") return "Each contributor's own account"
  const name = recipient.memberName ?? "Unnamed"
  return `${recipient.kind === "member" ? "Member" : "Customer"} account: ${name}`
}

/** Member, customer and contributor recipients mean the funds are held for that person, not the organization. */
export function recipientHoldsFunds(recipient: ContributionRecipient): boolean {
  return recipient.kind !== "organization"
}

/**
 * Who the funds are held for, without the account-kind prefix — "Chinedu Okafor",
 * or the account name for an organization recipient. Used in page headers.
 */
export function recipientHolderName(recipient: ContributionRecipient): string {
  if (recipient.kind === "organization") return recipient.accountName ?? recipient.label ?? "the organization account"
  if (recipient.kind === "contributor") return "each contributor"
  return recipient.memberName ?? recipient.label ?? "the selected person"
}

/** General plans pool everything; Personal plans hold a balance per member. */
export const isPersonal = (contribution: { form: ContributionForm }) => contribution.form === "Personal"

/** `Open` is the only scope with a link anyone can use without being a member. */
export const isOpenToEveryone = (contribution: { participantScope: ParticipantScope }) => contribution.participantScope === "Open"

/**
 * A Personal plan is a savings plan: it keeps running after a payout. A General pool closes
 * once it is paid out. This used to be a toggle; it is not a decision an administrator needs
 * to make twice.
 */
export const keepsRunningAfterPayout = (contribution: { form: ContributionForm }) => isPersonal(contribution)

/**
 * Commission is a savings concept: it is only ever charged on a Personal plan whose
 * administrator chose a model. A General pool pays out in full.
 */
export function commissionApplies(contribution: Contribution): boolean {
  if (contribution.commission.model === "none") return false
  return isPersonal(contribution)
}

export function commissionPreview(
  contribution: Contribution,
  gross: number,
  fees = 0,
): { applies: boolean; amount: number; net: number } {
  const applies = commissionApplies(contribution)
  const amount = applies ? commissionFor(contribution.commission, gross, fees) : 0
  return { applies, amount, net: Math.max(0, gross - amount - fees) }
}

/**
 * A public link works only while it is enabled *and* the contribution is Active, so closing,
 * pausing or completing a contribution automatically takes its link offline.
 */
export function publicLinkAvailable(contribution: Contribution): boolean {
  return Boolean(contribution.publicLink?.enabled) && contribution.status === "Active"
}

export function publicLinkPath(contribution: Contribution): string | undefined {
  return contribution.publicLink ? `/contribute/${contribution.publicLink.slug}` : undefined
}

/**
 * A member's own link. It identifies the member so the payment is recorded against their
 * balance rather than the pool. It works while the member is on the plan and the plan is
 * Active — a member link does not need the pool link to be open, which is what `Open` means.
 */
export function memberLinkPath(contribution: Contribution, memberId: string): string | undefined {
  const base = publicLinkPath(contribution)
  return base ? `${base}/m/${memberId}` : undefined
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
}

/** Above the configured threshold a payout needs a second approver. */
export function requiresApproval(contribution: Contribution, amount: number): boolean {
  if (contribution.payout.approvalThreshold <= 0) return amount > 0
  return amount > contribution.payout.approvalThreshold
}

/** Separation of duties: the person who requested a payout can never approve it. */
export function canApproveWithdrawal(withdrawal: ContributionWithdrawal, actorId: string): boolean {
  return withdrawal.status === "Pending approval" && withdrawal.requestedById !== actorId
}

export function frequencyLabel(contribution: Contribution): string {
  if (!contribution.frequencyBased) return "No frequency"
  if (contribution.frequency === "Custom") {
    return contribution.customFrequency?.label || `Every ${contribution.customFrequency?.days ?? 0} days`
  }
  return contribution.frequency
}

export function amountLabel(contribution: Contribution, currency = "₦"): string {
  const format = (value: number) => `${currency}${value.toLocaleString("en-NG")}`
  switch (contribution.type) {
    case "Fixed":
      return `${format(contribution.fixedAmount ?? 0)} ${contribution.frequencyBased ? frequencyLabel(contribution).toLowerCase() : "per contribution"}`
    case "Flexible":
      return contribution.minimumAmount ? `From ${format(contribution.minimumAmount)}` : "Any amount"
    case "Target":
      return `Target ${format(contribution.targetAmount ?? 0)}`
    default:
      return ""
  }
}

/** The next scheduled disbursement date, when the contribution pays out automatically. */
export function nextPayoutDate(contribution: Contribution, today: string): string | undefined {
  if (contribution.payout.mode !== "scheduled" || !contribution.payout.scheduledDate) return undefined
  if (contribution.payout.scheduledDate >= today) return contribution.payout.scheduledDate
  if (contribution.payout.scheduledInterval === "Weekly") {
    return toISODate(new Date(new Date(contribution.payout.scheduledDate).getTime() + 7 * 86_400_000))
  }
  if (contribution.payout.scheduledInterval === "Monthly") {
    const date = new Date(contribution.payout.scheduledDate)
    date.setMonth(date.getMonth() + 1)
    return toISODate(date)
  }
  return undefined
}

export function scheduleFor(
  dataset: ContributionDataset,
  contribution: Contribution,
  today: string,
): ContributionSchedule {
  const participants = dataset.participants.filter((p) => p.contributionId === contribution.id)
  const periods = generatePeriods(contribution, participants, dataset.transactions, today)
  return {
    contributionId: contribution.id,
    frequency: contribution.frequency,
    periods,
    nextDueDate: nextDueDate(periods, today),
  }
}

/** Participants whose contributions have fallen behind — never treated as a failed plan. */
export function participantsBehind(dataset: ContributionDataset, contributionId: string): number {
  return dataset.participants.filter((p) => p.contributionId === contributionId && p.state === "Behind").length
}

export function nextExpectedAmount(contribution: Contribution): number {
  return contribution.type === "Fixed" ? contribution.fixedAmount ?? 0 : contribution.minimumAmount ?? 0
}

export function isTimed(contribution: Contribution): boolean {
  return stepDays(contribution) !== null
}

function pendingPayoutAmount(withdrawal: ContributionWithdrawal): number {
  return withdrawal.netPayout
}

/** The nine figures the Overview dashboard reports. */
export function summarizeContributions(dataset: ContributionDataset): ContributionSummary {
  const balances = dataset.contributions.map((contribution) =>
    contributionBalance(contribution, dataset.transactions, dataset.withdrawals),
  )
  const awaiting = dataset.withdrawals.filter((w) =>
    w.status === "Pending approval" || w.status === "Approved" || w.status === "Scheduled",
  )
  const missed = dataset.periods.filter((p) => p.state === "Missed").length

  return {
    totalContributions: dataset.contributions.length,
    activeContributions: dataset.contributions.filter((c) => c.status === "Active").length,
    totalCollected: balances.reduce((sum, b) => sum + b.totalContributed, 0),
    availableBalance: balances.reduce((sum, b) => sum + b.availableBalance, 0),
    totalWithdrawn: balances.reduce((sum, b) => sum + b.totalWithdrawn, 0),
    pendingPayouts: awaiting.reduce((sum, w) => sum + pendingPayoutAmount(w), 0),
    pendingPayoutCount: awaiting.length,
    totalCommission: balances.reduce((sum, b) => sum + b.commissionAccrued, 0),
    missedContributions: missed,
  }
}
