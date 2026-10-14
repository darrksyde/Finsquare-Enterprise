import { env } from "@/app/config/env"
import { memberWalletFor } from "@/features/wallet/domain/wallet.rules"
import { walletServiceFor, type Mode } from "@/features/wallet/services/wallet.service"
import {
  commissionFor,
  contributionBalance,
  generatePeriods,
  payoutBreakdown,
  periodKeyFor,
  periodState,
  parseISODate,
  round2,
  toISODate,
} from "../domain/calculations"
import { commissionApplies, isPersonal, keepsRunningAfterPayout, nextExpectedAmount, paymentMethodsFor, publicLinkAvailable, requiresApproval, slugify } from "../domain/contribution.rules"
import { SEED_ORGANIZATION_ID } from "@/lib/tenancy/seed-tenant"
import { ApiContributionRepository } from "../repositories/api-contribution.repository"
import { createMockContributionRepository } from "../repositories/mock-contribution.repository"
import type { ContributionRepository } from "../repositories/contribution.repository"
import type {
  Contribution,
  ContributionCommission,
  ContributionDataset,
  ContributionParticipant,
  ContributionPeriod,
  ContributionStatus,
  ContributionTransaction,
  ContributionWithdrawal,
  CreateContributionInput,
  PublicContributionInput,
  PublicContributionReceipt,
  RecordContributionPaymentInput,
  RequestContributionWithdrawalInput,
} from "../types/contribution.types"

export interface ContributionActor {
  id: string
  name: string
}

export interface MutationContext {
  actor: ContributionActor
  /**
   * The environment's money-movement mode. It is passed straight through to the wallet module
   * so a contribution and the wallet agree on whether real money may move.
   */
  mode: Mode
}

/** Demo, pending-review and suspended environments record movements without moving money. */
const isSimulated = (ctx: MutationContext) => ctx.mode !== "live"

const now = () => new Date().toISOString()
let sequence = 0
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(sequence += 1).toString(36)}`

/**
 * The tenant the public contribution links belong to.
 *
 * A public link carries no session, so the tenant cannot come from the active community: it belongs
 * to the organisation that published the link. Resolving it from the slug is the backend's job, and
 * until then the links address the seeded organisation, which is where the published pools live.
 */
const PUBLIC_LINK_ORG_ID = SEED_ORGANIZATION_ID

/**
 * Contribution commands. Every method states what the real backend must enforce — balances,
 * commission, approval and audit are authoritative on the server, never here.
 */
export class ContributionService {
  constructor(private repo: ContributionRepository = createMockContributionRepository()) {}

  load = (organizationId: string) => this.repo.load(organizationId)
  subscribe = (listener: () => void) => this.repo.subscribe(listener)

  private async mutate(
    organizationId: string,
    update: (dataset: ContributionDataset) => Partial<ContributionDataset>,
  ): Promise<ContributionDataset> {
    const current = await this.repo.load(organizationId)
    const next = { ...current, ...update(current) }
    await this.repo.commit(organizationId, next)
    return next
  }

  /**
   * Creates a contribution plan. The backend must re-validate the type-specific amounts,
   * mint a unique public slug and record an audit entry attributing the change to the actor.
   */
  async createContribution(
    organizationId: string,
    input: CreateContributionInput,
    ctx: MutationContext,
  ): Promise<Contribution> {
    const dataset = await this.repo.load(organizationId)
    const taken = dataset.contributions
      .map((c) => c.publicLink?.slug)
      .filter((slug): slug is string => Boolean(slug))
    const base = slugify(input.name) || "contribution"
    let slug = base
    let index = 2
    while (taken.includes(slug)) {
      slug = `${base}-${index}`
      index += 1
    }

    const contribution: Contribution = {
      id: nextId("cont"),
      organizationId,
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      type: input.type,
      form: input.form,
      participantScope: input.participantScope,
      fixedAmount: input.type === "Fixed" ? input.fixedAmount : undefined,
      minimumAmount: input.type === "Flexible" ? input.minimumAmount : undefined,
      targetAmount: input.type === "Target" ? input.targetAmount : undefined,
      frequencyBased: input.frequencyBased,
      frequency: input.frequencyBased ? input.frequency : "None",
      customFrequency: input.frequency === "Custom" ? input.customFrequency : undefined,
      startDate: input.startDate,
      endDate: input.endDate || undefined,
      groupId: input.groupId,
      groupName: input.groupId ? input.groupName ?? input.groupId : undefined,
      recipient: input.recipient,
      commission: input.commission,
      payout: input.payout,
      paymentMethods: paymentMethodsFor(input.paymentMethods),
      // Every plan mints a slug: an `Open` plan's pool link accepts anyone, and a member plan's
      // own links (`/contribute/:slug/m/:memberId`) identify the member they belong to.
      publicLink: { slug, enabled: input.participantScope === "Open", createdAt: now() },
      status: "Active",
      currency: "NGN",
      createdAt: now(),
      createdBy: ctx.actor.name,
    }

    // The selected group's members are associated up front so expected/missed periods exist from day one.
    const roster: ContributionParticipant[] = (input.participants ?? []).map((entry) => ({
      id: `${contribution.id}:${entry.memberId}`,
      organizationId,
      contributionId: contribution.id,
      memberId: entry.memberId,
      memberName: entry.memberName,
      memberCode: entry.memberCode,
      isExternal: false,
      contact: entry.contact ?? {},
      branchId: entry.branchId,
      branchName: entry.branchName,
      expectedAmount: contribution.frequencyBased ? nextExpectedAmount(contribution) : 0,
      totalContributed: 0,
      availableBalance: 0,
      missedCount: 0,
      lateCount: 0,
      state: "On track",
      joinedAt: contribution.startDate,
    }))

    // A Personal plan holds each member's money, so their wallet is opened when they join.
    if (input.form === "Personal") {
      for (const entry of input.participants ?? []) {
        await walletServiceFor(organizationId).ensureMemberWallet({ memberId: entry.memberId, memberName: entry.memberName }, ctx.actor)
      }
    }

    await this.mutate(organizationId, (current) => ({
      contributions: [contribution, ...current.contributions],
      participants: [...roster, ...current.participants],
      periods: [
        ...generatePeriods(contribution, roster, [], toISODate(new Date())),
        ...current.periods,
      ],
    }))
    return contribution
  }

  /** Editing a live plan: the backend must recompute pending payouts and re-audit. */
  async updateContribution(
    organizationId: string,
    contributionId: string,
    patch: Partial<CreateContributionInput>,
    ctx: MutationContext,
  ): Promise<void> {
    await this.mutate(organizationId, (current) => ({
      contributions: current.contributions.map((contribution) =>
        contribution.id === contributionId
          ? {
              ...contribution,
              ...(patch.name ? { name: patch.name.trim() } : {}),
              ...(patch.description !== undefined ? { description: patch.description?.trim() || undefined } : {}),
              ...(patch.recipient ? { recipient: patch.recipient } : {}),
              ...(patch.payout ? { payout: patch.payout } : {}),
              ...(patch.paymentMethods ? { paymentMethods: paymentMethodsFor(patch.paymentMethods) } : {}),
            }
          : contribution,
      ),
    }))
    void ctx
  }

  /**
   * Status changes drive the public link: only an Active contribution exposes one, so closing
   * or completing a plan takes its contribution page offline automatically.
   */
  async setStatus(
    organizationId: string,
    contributionId: string,
    status: ContributionStatus,
    ctx: MutationContext,
  ): Promise<void> {
    await this.mutate(organizationId, (current) => ({
      contributions: current.contributions.map((contribution) =>
        contribution.id === contributionId ? { ...contribution, status } : contribution,
      ),
    }))
    void ctx
  }

  async updateCommission(
    organizationId: string,
    contributionId: string,
    commission: ContributionCommission,
    ctx: MutationContext,
  ): Promise<void> {
    await this.mutate(organizationId, (current) => ({
      contributions: current.contributions.map((contribution) =>
        contribution.id === contributionId ? { ...contribution, commission } : contribution,
      ),
    }))
    void ctx
  }

  /** Enabling or disabling the shareable public contribution link. */
  async setPublicLink(
    organizationId: string,
    contributionId: string,
    enabled: boolean,
    ctx: MutationContext,
  ): Promise<Contribution | undefined> {
    let updated: Contribution | undefined
    await this.mutate(organizationId, (current) => ({
      contributions: current.contributions.map((contribution) => {
        if (contribution.id !== contributionId) return contribution
        const slug = contribution.publicLink?.slug ?? `${slugify(contribution.name) || "contribution"}-${contribution.id.slice(-4)}`
        updated = {
          ...contribution,
          publicLink: {
            slug,
            enabled,
            createdAt: contribution.publicLink?.createdAt ?? now(),
            disabledAt: enabled ? undefined : now(),
          },
        }
        return updated
      }),
    }))
    void ctx
    return updated
  }

  /**
   * Records a contribution payment (manual entry, bank transfer confirmation or a settled
   * automatic collection). The backend must confirm the money actually arrived before the
   * balance becomes withdrawable.
   */
  async recordPayment(
    organizationId: string,
    input: RecordContributionPaymentInput,
    ctx: MutationContext,
  ): Promise<ContributionTransaction | undefined> {
    const dataset = await this.repo.load(organizationId)
    const contribution = dataset.contributions.find((c) => c.id === input.contributionId)
    const participant = dataset.participants.find((p) => p.id === input.participantId)
    if (!contribution || !participant) return undefined

    const date = now()
    // The wallet pays first: a contribution is only recorded once the money has actually moved.
    if (input.method === "wallet") {
      await this.debitMemberWallet(organizationId, contribution, participant, round2(input.amount), ctx)
    }
    const transaction: ContributionTransaction = {
      id: nextId("cttx"),
      organizationId,
      reference: `CTR-${Math.floor(100_000 + Math.random() * 899_999)}`,
      contributionId: contribution.id,
      participantId: participant.id,
      contributorName: participant.memberName,
      type: "Contribution",
      method: input.method,
      amount: round2(input.amount),
      fee: 0,
      commission: 0,
      netAmount: round2(input.amount),
      direction: "credit",
      status: "Completed",
      date,
      recordedBy: ctx.actor.name,
      note: input.note,
      simulated: isSimulated(ctx),
    }

    const periodKey = input.periodKey ?? periodKeyFor(parseISODate(date), contribution.frequency)
    const periods = this.applyPaymentToPeriods(dataset.periods, contribution, participant, periodKey, transaction.amount, date)
    const totalContributed = round2(participant.totalContributed + transaction.amount)
    const alreadyWithdrawn = round2(participant.totalContributed - participant.availableBalance)

    await this.mutate(organizationId, (current) => ({
      transactions: [transaction, ...current.transactions],
      periods,
      participants: current.participants.map((p) =>
        p.id === participant.id
          ? {
              ...p,
              totalContributed,
              availableBalance: round2(Math.max(0, totalContributed - alreadyWithdrawn)),
              state: p.state === "Behind" && totalContributed > 0 ? "On track" : p.state,
            }
          : p,
      ),
    }))
    return transaction
  }

  private applyPaymentToPeriods(
    periods: ContributionPeriod[],
    contribution: Contribution,
    participant: ContributionParticipant,
    periodKey: string,
    amount: number,
    today: string,
  ): ContributionPeriod[] {
    const todayISO = today.slice(0, 10)
    const existing = periods.filter(
      (p) => p.contributionId === contribution.id && p.participantId === participant.id,
    )
    const target = existing.find((p) => p.periodKey === periodKey)
    if (target) {
      const paidAmount = round2(target.paidAmount + amount)
      return periods.map((p) =>
        p.id === target.id
          ? { ...p, paidAmount, state: periodState(p.expectedAmount, paidAmount, p.dueDate, todayISO) }
          : p,
      )
    }
    // No schedule yet for this participant (e.g. a non-frequency contribution): create one entry.
    const created: ContributionPeriod = {
      id: `${contribution.id}:${participant.id}:${periodKey}`,
      organizationId: contribution.organizationId,
      contributionId: contribution.id,
      participantId: participant.id,
      periodKey,
      dueDate: todayISO,
      expectedAmount: participant.expectedAmount || amount,
      paidAmount: amount,
      state: "Paid",
    }
    return [...periods, created]
  }

  /**
   * Requests a payout. Below the configured threshold the money is released immediately; above
   * it, the request waits for a different approver (`contributions.approve_withdrawal`).
   */
  async requestWithdrawal(
    organizationId: string,
    input: RequestContributionWithdrawalInput,
    ctx: MutationContext,
  ): Promise<ContributionWithdrawal | undefined> {
    const dataset = await this.repo.load(organizationId)
    const contribution = dataset.contributions.find((c) => c.id === input.contributionId)
    if (!contribution) return undefined

    const balance = contributionBalance(contribution, dataset.transactions, dataset.withdrawals)
    const participant = input.participantId
      ? dataset.participants.find((p) => p.id === input.participantId)
      : undefined
    // A Personal plan holds a balance per member, so it is always paid out member by member.
    // A General plan has one pool, so it is always paid out as a whole.
    if (isPersonal(contribution) && !participant) return undefined
    if (!isPersonal(contribution) && participant) return undefined
    const gross = round2(Math.min(input.amount, participant ? participant.availableBalance : balance.availableBalance))
    if (gross <= 0) return undefined

    const fees = Math.max(0, input.fees ?? 0)
    const commission = commissionApplies(contribution) ? commissionFor(contribution.commission, gross, fees) : 0
    const breakdown = payoutBreakdown(gross, commission, fees)
    const needsApproval = requiresApproval(contribution, gross)
    const requestedAt = now()
    const isScheduled = input.kind === "Scheduled"

    const withdrawal: ContributionWithdrawal = {
      id: nextId("cwd"),
      organizationId,
      reference: `WDR-${Math.floor(10_000 + Math.random() * 89_999)}`,
      contributionId: contribution.id,
      participantId: participant?.id,
      kind: input.kind,
      grossAmount: breakdown.gross,
      commission: breakdown.commission,
      fees: breakdown.fees,
      netPayout: breakdown.net,
      status: isScheduled ? "Scheduled" : needsApproval ? "Pending approval" : "Completed",
      destination: participant
        ? `${participant.memberName} · ${contribution.recipient.label}`
        : contribution.recipient.label,
      requestedBy: ctx.actor.name,
      requestedById: ctx.actor.id,
      requestedAt,
      approvedBy: needsApproval || isScheduled ? undefined : ctx.actor.name,
      approvedAt: needsApproval || isScheduled ? undefined : requestedAt,
      scheduledFor: input.scheduledFor,
      completedAt: needsApproval || isScheduled ? undefined : requestedAt,
      note: input.note,
    }

    const update: Partial<ContributionDataset> = {
      withdrawals: [withdrawal, ...dataset.withdrawals],
    }
    if (withdrawal.status === "Completed") {
      await this.creditPayout(organizationId, contribution, withdrawal, dataset.participants, ctx)
      update.transactions = [this.withdrawalTransaction(contribution, withdrawal, ctx), ...dataset.transactions]
      update.contributions = dataset.contributions.map((c) =>
        c.id === contribution.id ? this.settleContribution(c, withdrawal) : c,
      )
      update.participants = this.settleParticipants(dataset.participants, withdrawal)
    }

    await this.mutate(organizationId, () => update)
    return withdrawal
  }

  /** Approving a payout releases the money and records the debit — approver ≠ requester. */
  async approveWithdrawal(
    organizationId: string,
    withdrawalId: string,
    ctx: MutationContext,
  ): Promise<ContributionWithdrawal | undefined> {
    const dataset = await this.repo.load(organizationId)
    const withdrawal = dataset.withdrawals.find((w) => w.id === withdrawalId)
    const contribution = withdrawal ? dataset.contributions.find((c) => c.id === withdrawal.contributionId) : undefined
    if (!withdrawal || !contribution) return undefined
    if (withdrawal.status !== "Pending approval" || withdrawal.requestedById === ctx.actor.id) return undefined

    const approved: ContributionWithdrawal = {
      ...withdrawal,
      status: "Completed",
      approvedBy: ctx.actor.name,
      approvedAt: now(),
      completedAt: now(),
    }

    await this.creditPayout(organizationId, contribution, approved, dataset.participants, ctx)

    await this.mutate(organizationId, (current) => ({
      withdrawals: current.withdrawals.map((w) => (w.id === withdrawalId ? approved : w)),
      transactions: [this.withdrawalTransaction(contribution, approved, ctx), ...current.transactions],
      contributions: current.contributions.map((c) =>
        c.id === contribution.id ? this.settleContribution(c, approved) : c,
      ),
      participants: this.settleParticipants(current.participants, approved),
    }))
    return approved
  }

  async rejectWithdrawal(
    organizationId: string,
    withdrawalId: string,
    ctx: MutationContext,
    note?: string,
  ): Promise<void> {
    await this.mutate(organizationId, (current) => ({
      withdrawals: current.withdrawals.map((w) =>
        w.id === withdrawalId && w.status === "Pending approval"
          ? { ...w, status: "Rejected", approvedBy: ctx.actor.name, approvedAt: now(), note: note ?? w.note }
          : w,
      ),
    }))
  }

  /** Releases scheduled payouts whose date has arrived. Called on load and by the payouts page. */
  async releaseDuePayouts(organizationId: string, today: string, ctx: MutationContext): Promise<number> {
    const dataset = await this.repo.load(organizationId)
    const due = dataset.withdrawals.filter(
      (w) => w.status === "Scheduled" && Boolean(w.scheduledFor) && (w.scheduledFor as string) <= today,
    )
    if (!due.length) return 0

    const released: ContributionTransaction[] = []
    let contributions = dataset.contributions
    let participants = dataset.participants
    for (const withdrawal of due) {
      const contribution = contributions.find((c) => c.id === withdrawal.contributionId)
      if (!contribution) continue
      const completed: ContributionWithdrawal = { ...withdrawal, status: "Completed", completedAt: now() }
      await this.creditPayout(organizationId, contribution, completed, participants, ctx)
      released.push(this.withdrawalTransaction(contribution, completed, ctx))
      contributions = contributions.map((c) => (c.id === contribution.id ? this.settleContribution(c, completed) : c))
      participants = this.settleParticipants(participants, completed)
      withdrawal.status = "Completed"
      withdrawal.completedAt = now()
    }

    await this.mutate(organizationId, () => ({
      withdrawals: [...dataset.withdrawals],
      transactions: [...released, ...dataset.transactions],
      contributions,
      participants,
    }))
    return due.length
  }

  /**
   * Public contribution submitted from a shared link. No FinSquare account is required, and
   * the backend must verify the link is still open and settle the payment before crediting.
   */
  async submitPublicContribution(
    input: PublicContributionInput,
    ctx?: MutationContext,
  ): Promise<PublicContributionReceipt | undefined> {
    // The link is public, so it carries no administrator session. A wallet payment still needs a
    // mode and an actor, so the contributor stands in for both.
    const mutationCtx: MutationContext = ctx ?? {
      actor: { id: "public-link", name: "Contribution link" },
      mode: "simulated",
    }
    const dataset = await this.repo.load(PUBLIC_LINK_ORG_ID)
    const contribution = dataset.contributions.find((c) => c.publicLink?.slug === input.slug)
    if (!contribution) return undefined

    // A member's own link identifies them, so the payment lands on their balance rather than
    // being treated as a new external contributor. Member links do not need the pool link to be
    // open — they work while the member is on the plan and it is Active.
    const onBehalfOf = input.memberId
      ? dataset.participants.find((p) => p.contributionId === contribution.id && p.memberId === input.memberId)
      : undefined
    const openToEveryone = publicLinkAvailable(contribution)
    if (input.memberId ? !onBehalfOf || contribution.status !== "Active" : !openToEveryone) return undefined

    const existing =
      onBehalfOf ??
      dataset.participants.find(
        (p) => p.contributionId === contribution.id && p.memberName.toLowerCase() === input.contributorName.toLowerCase(),
      )
    const participant: ContributionParticipant =
      existing ?? {
        id: nextId(`${contribution.id}:ext`),
        organizationId: PUBLIC_LINK_ORG_ID,
        contributionId: contribution.id,
        memberName: input.contributorName.trim(),
        isExternal: true,
        contact: { phone: input.phone, email: input.email },
        expectedAmount: 0,
        totalContributed: 0,
        availableBalance: 0,
        missedCount: 0,
        lateCount: 0,
        state: "On track",
        joinedAt: now(),
      }

    // A wallet payment settles immediately, so the money moves first and the balance updates now.
    // Anything else waits for the provider, and the administrator confirms it later.
    const payingFromWallet = input.method === "wallet"
    if (payingFromWallet) {
      await this.debitMemberWallet(PUBLIC_LINK_ORG_ID, contribution, participant, round2(input.amount), mutationCtx)
    }
    const amount = round2(input.amount)
    const settledBalance = payingFromWallet && existing
      ? {
          totalContributed: round2(existing.totalContributed + amount),
          availableBalance: round2(existing.availableBalance + amount),
        }
      : {}

    const reference = `PUB-${Math.floor(100_000 + Math.random() * 899_999)}`
    const transaction: ContributionTransaction = {
      id: nextId("cttx"),
      organizationId: PUBLIC_LINK_ORG_ID,
      reference,
      contributionId: contribution.id,
      participantId: participant.id,
      contributorName: participant.memberName,
      type: "Contribution",
      method: input.method,
      amount,
      fee: 0,
      commission: 0,
      netAmount: amount,
      direction: "credit",
      status: payingFromWallet ? "Completed" : "Pending",
      date: now(),
      recordedBy: onBehalfOf ? "Member link" : "Public link",
      external: !onBehalfOf,
      simulated: isSimulated(mutationCtx),
    }

    await this.repo.commit(PUBLIC_LINK_ORG_ID, {
      participants: existing
        ? dataset.participants.map((p) => (p.id === existing.id ? { ...p, ...settledBalance } : p))
        : [...dataset.participants, participant],
      transactions: [transaction, ...dataset.transactions],
    })

    return {
      reference,
      contributionName: contribution.name,
      contributorName: participant.memberName,
      amount: transaction.amount,
      recipientLabel: contribution.recipient.label,
    }
  }

  /**
   * Resolves a public link without exposing the rest of the dataset.
   *
   * `memberId` is present when the link is a member's own link (`/contribute/:slug/m/:memberId`),
   * which records the payment against that member's balance instead of the pool.
   */
  async findPublicContribution(
    slug: string,
    memberId?: string,
  ): Promise<{ contribution: Contribution; dataset: ContributionDataset; participant?: ContributionParticipant } | undefined> {
    const dataset = await this.repo.load(PUBLIC_LINK_ORG_ID)
    const contribution = dataset.contributions.find((c) => c.publicLink?.slug === slug)
    if (!contribution) return undefined
    const participant = memberId
      ? dataset.participants.find((p) => p.contributionId === contribution.id && p.memberId === memberId)
      : undefined
    return { contribution, dataset, participant }
  }

  /**
   * Pays a completed payout into a wallet. A `contributor` recipient pays each member into their
   * own wallet, a named member or customer pays that person, and the organization pays the
   * treasury. The backend settles this in the same transaction as the plan debit.
   */
  private async creditPayout(
    organizationId: string,
    contribution: Contribution,
    withdrawal: ContributionWithdrawal,
    participants: ContributionParticipant[],
    ctx: MutationContext,
  ): Promise<void> {
    const targetWalletId = await this.payoutWalletId(organizationId, contribution, withdrawal, participants)
    if (!targetWalletId) return
    await walletServiceFor(organizationId).credit(
      {
        walletId: targetWalletId,
        amount: withdrawal.netPayout,
        type: "Contribution",
        description: `${contribution.name} — payout ${withdrawal.reference}`,
        reference: withdrawal.reference,
        sender: contribution.name,
        related: { contributionId: contribution.id, contributionName: contribution.name, memberName: withdrawal.destination },
      },
      ctx.actor,
      ctx.mode,
    )
  }

  private async payoutWalletId(
    organizationId: string,
    contribution: Contribution,
    withdrawal: ContributionWithdrawal,
    participants: ContributionParticipant[],
  ): Promise<string | undefined> {
    const { recipient } = contribution
    const dataset = await walletServiceFor(organizationId).load()
    const memberId =
      recipient.kind === "contributor"
        ? participants.find((p) => p.id === withdrawal.participantId)?.memberId
        : recipient.memberId
    if (recipient.kind !== "organization" && memberId) {
      return memberWalletFor(dataset.wallets, memberId)?.id
    }
    const explicit = dataset.wallets.find((w) => w.id === recipient.accountId)
    return (explicit ?? dataset.wallets.find((w) => w.type === "Main Organization"))?.id
  }

  /** Debits the contributor's own wallet for a wallet-method payment. Throws if it cannot pay. */
  private async debitMemberWallet(
    organizationId: string,
    contribution: Contribution,
    participant: ContributionParticipant,
    amount: number,
    ctx: MutationContext,
  ): Promise<void> {
    if (!participant.memberId) throw new Error("This contributor has no member wallet to pay from.")
    const wallet = await walletServiceFor(organizationId).ensureMemberWallet(
      { memberId: participant.memberId, memberName: participant.memberName },
      ctx.actor,
    )
    await walletServiceFor(organizationId).spend(
      {
        walletId: wallet.id,
        amount,
        type: "Contribution",
        kind: "Contribution",
        description: `${contribution.name} — contribution`,
        reference: contribution.id,
        counterparty: contribution.name,
        related: { contributionId: contribution.id, contributionName: contribution.name, memberName: participant.memberName },
      },
      ctx.actor,
      ctx.mode,
    )
  }

  private withdrawalTransaction(
    contribution: Contribution,
    withdrawal: ContributionWithdrawal,
    ctx: MutationContext,
  ): ContributionTransaction {
    return {
      id: nextId("cttx"),
      organizationId: contribution.organizationId,
      reference: withdrawal.reference,
      contributionId: contribution.id,
      participantId: withdrawal.participantId,
      contributorName: ctx.actor.name,
      type: "Withdrawal",
      method: "wallet",
      amount: withdrawal.netPayout,
      fee: withdrawal.fees,
      commission: withdrawal.commission,
      netAmount: withdrawal.netPayout,
      direction: "debit",
      status: "Completed",
      date: now(),
      recordedBy: ctx.actor.name,
      note: withdrawal.note,
      simulated: isSimulated(ctx),
    }
  }

  /**
   * A full payout closes a General pool — the money is gone. A Personal plan is a savings plan,
   * so it keeps running and the member carries on contributing.
   */
  private settleContribution(contribution: Contribution, withdrawal: ContributionWithdrawal): Contribution {
    const closesPlan = withdrawal.kind === "Full" && !keepsRunningAfterPayout(contribution)
    return closesPlan ? { ...contribution, status: "Completed" } : contribution
  }

  private settleParticipants(
    participants: ContributionParticipant[],
    withdrawal: ContributionWithdrawal,
  ): ContributionParticipant[] {
    const targetId = withdrawal.participantId
    return participants.map((participant) => {
      const isContributor = Boolean(targetId) && participant.id === targetId
      const isShared = !targetId && participant.contributionId === withdrawal.contributionId
      if (!isContributor && !isShared) return participant
      return { ...participant, availableBalance: round2(Math.max(0, participant.availableBalance - withdrawal.grossAmount)) }
    })
  }

  /** Rebuilds a schedule for one contribution without mutating stored state. */
  scheduleFor(dataset: ContributionDataset, contribution: Contribution, today: string): ContributionPeriod[] {
    return generatePeriods(contribution, dataset.participants, dataset.transactions, today)
  }
}

/**
 * The UI depends on this service only. Switching to the real backend is a one-line change:
 * set `VITE_ENABLE_MOCKS=false` and `ApiContributionRepository` takes over.
 */
export const contributionsService = new ContributionService(
  env.VITE_ENABLE_MOCKS ? createMockContributionRepository() : new ApiContributionRepository(),
)
