import { env } from "@/app/config/env"
import { memberWalletFor } from "@/features/wallet/domain/wallet.rules"
import { walletService, type Mode } from "@/features/wallet/services/wallet.service"
import { generateCharges, round2, toISODate } from "../domain/schedule"
import { lienRecoverable, outstandingOf, recoveryAllocation, syncCharge, syncCharges } from "../domain/dues.rules"
import { ApiDuesRepository } from "../repositories/api-dues.repository"
import { createMockDuesRepository } from "../repositories/mock-dues.repository"
import type { DuesRepository } from "../repositories/dues.repository"
import type {
  CreateDuesPlanInput,
  DuesCharge,
  DuesDataset,
  DuesLienRules,
  DuesParticipant,
  DuesPlan,
  DuesPlanStatus,
  DuesRecoveryResult,
  DuesTransaction,
  RecordDuesPaymentInput,
} from "../types/dues.types"
export interface DuesActor {
  id: string
  name: string
}
export interface MutationContext {
  actor: DuesActor
  /**
   * The environment's money-movement mode, passed straight through to the wallet module so a dues
   * collection and the wallet always agree on whether real money may move.
   */
  mode: Mode
}
/** The actor recorded when money is collected without an administrator pressing a button. */
export const AUTOMATIC_RECOVERY_ACTOR: DuesActor = {
  id: "system",
  name: "Automatic recovery",
}
/** Demo, pending-review and suspended environments record movements without moving money. */
const isSimulated = (ctx: MutationContext) => ctx.mode !== "live"
const now = () => new Date().toISOString()
let sequence = 0
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(sequence += 1).toString(36)}`
const reference = () => `DSQ-${Math.floor(100000 + Math.random() * 899999)}`
/**
 * Dues commands. Every method states what the real backend must enforce — charge states, liens,
 * outstanding amounts, wallet deductions and audit are authoritative on the server, never here.
 *
 * A dues payment moves money through the wallet exactly once: the wallet is debited *before* the
 * charge is marked paid, and a recovery run reads the charge's own outstanding amount so it can
 * never take the same money twice. The backend must do both sides in one transaction.
 */
export class DuesService {
  constructor(
    private repo: DuesRepository = env.VITE_ENABLE_MOCKS ? createMockDuesRepository() : new ApiDuesRepository(),
  ) {}
  load = (organizationId: string) => this.repo.load(organizationId)
  subscribe = (listener: () => void) => this.repo.subscribe(listener)
  private async mutate(
    organizationId: string,
    update: (dataset: DuesDataset) => Partial<DuesDataset>,
  ): Promise<DuesDataset> {
    const current = await this.repo.load(organizationId)
    const next = { ...current, ...update(current) }
    await this.repo.commit(organizationId, next)
    return next
  }
  /**
   * Creates a plan, its roster and the expected charge ledger for that roster.
   * The backend must re-validate the amount and the schedule, derive the roster from the scope
   * itself rather than trusting the client's list, and record an audit entry.
   */
  async createPlan(organizationId: string, input: CreateDuesPlanInput, ctx: MutationContext): Promise<DuesPlan> {
    const today = toISODate(new Date())
    const plan: DuesPlan = {
      id: nextId("dues"),
      organizationId,
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      amount: round2(input.amount),
      currency: "NGN",
      frequency: input.frequency,
      customFrequency: input.customFrequency,
      startDate: input.startDate,
      endDate: input.endDate || undefined,
      scope: input.scope,
      groupId: input.groupId,
      groupName: input.groupName,
      branchId: input.branchId,
      branchName: input.branchName,
      lien: input.lien,
      status: "Active",
      createdAt: now(),
      createdBy: ctx.actor.name,
    }
    const participants: DuesParticipant[] = input.roster.map((entry) => ({
      id: `${plan.id}:${entry.memberId}`,
      organizationId,
      duesPlanId: plan.id,
      memberId: entry.memberId,
      memberName: entry.memberName,
      memberCode: entry.memberCode,
      branchId: entry.branchId,
      branchName: entry.branchName,
      phone: entry.phone,
      joinedAt: plan.startDate,
    }))
    const charges = syncCharges(
      generateCharges(
        plan,
        participants.map((p) => ({ id: p.id, memberId: p.memberId })),
        today,
      ),
      [plan],
      today,
    )
    await this.mutate(organizationId, (current) => ({
      plans: [plan, ...current.plans],
      participants: [...participants, ...current.participants],
      charges: [...charges, ...current.charges],
    }))
    void ctx
    return plan
  }
  /**
   * Pauses, resumes or closes a plan.
   *
   * Pausing stops new claims being raised; closing also drops charges that are not due yet, because
   * a closed plan must not keep demanding money. Nothing already owed is removed. The backend must
   * attribute the change to the signed-in administrator in its audit record.
   */
  async setStatus(organizationId: string, planId: string, status: DuesPlanStatus): Promise<DuesPlan | undefined> {
    const dataset = await this.repo.load(organizationId)
    const plan = dataset.plans.find((candidate) => candidate.id === planId)
    if (!plan) return undefined
    const today = toISODate(new Date())
    const next: DuesPlan = { ...plan, status }
    const charges =
      status === "Closed"
        ? dataset.charges.filter((charge) => charge.duesPlanId !== planId || charge.dueDate <= today)
        : syncCharges(dataset.charges, [next], today)
    await this.mutate(organizationId, () => ({
      plans: dataset.plans.map((candidate) => (candidate.id === planId ? next : candidate)),
      charges,
    }))
    return next
  }
  /** Changes the lien rules of an existing plan. Organization-level money policy. */
  async updateLienRules(organizationId: string, planId: string, lien: DuesLienRules): Promise<DuesPlan | undefined> {
    const dataset = await this.repo.load(organizationId)
    const plan = dataset.plans.find((candidate) => candidate.id === planId)
    if (!plan) return undefined
    const today = toISODate(new Date())
    const next: DuesPlan = { ...plan, lien }
    await this.mutate(organizationId, () => ({
      plans: dataset.plans.map((candidate) => (candidate.id === planId ? next : candidate)),
      charges: syncCharges(dataset.charges, [next], today),
    }))
    return next
  }
  /**
   * Records a payment against what a participant owes.
   *
   * The amount is spread across that participant's due charges, oldest first, and never exceeds
   * what they owe — so a part payment leaves the rest outstanding and a larger payment settles
   * several periods. A `wallet` payment debits the member's wallet first; cash and bank transfers
   * are recorded as received.
   */
  async recordPayment(
    organizationId: string,
    input: RecordDuesPaymentInput,
    ctx: MutationContext,
  ): Promise<DuesTransaction | undefined> {
    const dataset = await this.repo.load(organizationId)
    const plan = dataset.plans.find((candidate) => candidate.id === input.duesPlanId)
    const participant = dataset.participants.find((candidate) => candidate.id === input.participantId)
    if (!plan || !participant) return undefined
    const amount = round2(input.amount)
    if (amount <= 0) return undefined
    const today = toISODate(new Date())
    const owed = this.dueCharges(dataset, plan, participant.id, today, input.chargeId)
    const owedTotal = round2(owed.reduce((sum, charge) => sum + outstandingOf(charge), 0))
    if (owedTotal <= 0) return undefined
    if (amount > owedTotal) {
      throw new Error(`That is more than this member owes (${owedTotal.toLocaleString("en-NG")}).`)
    }
    // The wallet pays first: dues are only recorded once the money has actually moved.
    if (input.method === "wallet") {
      await this.debitMemberWallet(plan, participant, amount, ctx)
    }
    const distributed = this.distribute(dataset.charges, owed, amount)
    const transaction: DuesTransaction = {
      id: nextId("dtx"),
      organizationId,
      reference: reference(),
      duesPlanId: plan.id,
      participantId: participant.id,
      memberId: participant.memberId,
      memberName: participant.memberName,
      chargeId: input.chargeId,
      periodKey: owed[0]?.periodKey,
      type: "Payment",
      method: input.method,
      amount,
      direction: "credit",
      status: "Completed",
      date: now(),
      recordedBy: ctx.actor.name,
      note: input.note,
      simulated: isSimulated(ctx),
    }
    await this.mutate(organizationId, () => ({
      charges: syncCharges(distributed, [plan], today),
      transactions: [transaction, ...dataset.transactions],
    }))
    return transaction
  }
  /**
   * Collects what members owe from their wallets, following each plan's lien rules.
   *
   * Oldest dues first, capped at each charge's outstanding amount and at the wallet's available
   * balance, so nothing is taken twice and nothing beyond what is owed. A charge a wallet limit
   * refuses is left outstanding with the reason recorded, and the next one is attempted.
   */
  async runLienRecovery(
    organizationId: string,
    ctx: MutationContext,
    options: {
      memberId?: string
      planId?: string
    } = {},
  ): Promise<DuesRecoveryResult> {
    const scopeKey = `${organizationId}:${options.memberId ?? "*"}:${options.planId ?? "*"}`
    // An automatic recovery and an administrator's "Recover now" must not run at the same time.
    if (this.recovering.has(scopeKey)) {
      return { recovered: 0, chargesSettled: 0, membersTouched: 0, skipped: 0 }
    }
    this.recovering.add(scopeKey)
    try {
      const today = toISODate(new Date())
      const dataset = await this.repo.load(organizationId)
      const plansById = new Map(dataset.plans.map((plan) => [plan.id, plan]))
      const walletData = await walletService.load()
      const candidates = syncCharges(dataset.charges, dataset.plans, today).filter((charge) => {
        const plan = plansById.get(charge.duesPlanId)
        if (!plan) return false
        if (options.planId && charge.duesPlanId !== options.planId) return false
        if (options.memberId && charge.memberId !== options.memberId) return false
        return lienRecoverable(charge, plan, today)
      })
      const byMember = new Map<string, DuesCharge[]>()
      for (const charge of candidates) {
        byMember.set(charge.memberId, [...(byMember.get(charge.memberId) ?? []), charge])
      }
      const result: DuesRecoveryResult = {
        recovered: 0,
        chargesSettled: 0,
        membersTouched: 0,
        skipped: 0,
      }
      const updated = new Map(dataset.charges.map((charge) => [charge.id, charge]))
      const transactions: DuesTransaction[] = []
      for (const [memberId, memberCharges] of byMember) {
        const wallet = memberWalletFor(walletData.wallets, memberId)
        if (!wallet || wallet.status !== "active" || wallet.availableBalance <= 0) {
          result.skipped += memberCharges.length
          continue
        }
        const participant = dataset.participants.find((candidate) => candidate.id === memberCharges[0].participantId)
        const lines = recoveryAllocation(memberCharges, wallet.availableBalance, plansById, today)
        let touched = false
        for (const line of lines) {
          const plan = plansById.get(line.charge.duesPlanId)
          if (!plan) continue
          try {
            await walletService.spend(
              {
                walletId: wallet.id,
                amount: line.amount,
                type: "Dues",
                kind: "Withdrawal",
                description: `${plan.name} — ${line.charge.periodKey}`,
                reference: `dues:${line.charge.id}`,
                counterparty: participant?.memberName ?? memberId,
                related: {
                  duesId: plan.id,
                  duesName: plan.name,
                  memberName: participant?.memberName,
                },
              },
              ctx.actor,
              ctx.mode,
            )
          } catch (reason) {
            // Nothing was deducted. Stop rather than reaching past this charge for a later one, so
            // "oldest dues first" stays true; the reason is recorded and the next run retries.
            transactions.push(
              this.recoveryTransaction(
                dataset,
                line.charge,
                line.amount,
                ctx,
                "Failed",
                reason instanceof Error ? reason.message : "Recovery failed",
              ),
            )
            break
          }
          const current = updated.get(line.charge.id) ?? line.charge
          updated.set(line.charge.id, {
            ...current,
            paidAmount: round2(current.paidAmount + line.amount),
            lastRecoveryAt: today,
          })
          transactions.push(this.recoveryTransaction(dataset, line.charge, line.amount, ctx, "Completed"))
          result.recovered = round2(result.recovered + line.amount)
          if (round2(current.paidAmount + line.amount) >= current.expectedAmount) result.chargesSettled += 1
          touched = true
        }
        if (touched) result.membersTouched += 1
      }
      if (transactions.length > 0) {
        await this.mutate(organizationId, () => ({
          charges: syncCharges([...updated.values()], dataset.plans, today),
          transactions: [...transactions, ...dataset.transactions],
        }))
      }
      return result
    } finally {
      this.recovering.delete(scopeKey)
    }
  }
  /**
   * Subscribes to the wallet so outstanding dues are collected as soon as money reaches a member's
   * wallet. Returns the unsubscribe function; the hook owns the subscription's lifetime because it
   * knows the environment's money-movement mode.
   */
  startAutoRecovery(organizationId: string, mode: Mode): () => void {
    return walletService.onWalletsCredited((wallets) => {
      const memberIds = new Set(
        wallets
          .filter((wallet) => wallet.scope === "member" && wallet.memberId)
          .map((wallet) => wallet.memberId as string),
      )
      for (const memberId of memberIds) {
        const ctx: MutationContext = { actor: AUTOMATIC_RECOVERY_ACTOR, mode }
        void this.runLienRecovery(organizationId, ctx, { memberId }).catch(() => {
          /* an automatic recovery must never break the funding that triggered it */
        })
      }
    })
  }
  /** Guards against an automatic recovery and a manual one overlapping. */
  private recovering = new Set<string>()
  private dueCharges(
    dataset: DuesDataset,
    plan: DuesPlan,
    participantId: string,
    today: string,
    chargeId?: string,
  ): DuesCharge[] {
    const due = dataset.charges
      .filter((charge) => charge.duesPlanId === plan.id && charge.participantId === participantId)
      .map((charge) => syncCharge(charge, plan, today))
      .filter((charge) => charge.dueDate <= today && outstandingOf(charge) > 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.periodKey.localeCompare(b.periodKey))
    if (!chargeId) return due
    const chosen = due.find((charge) => charge.id === chargeId)
    if (!chosen) return due
    // Settle the charge the administrator named first, then the rest oldest first.
    return [chosen, ...due.filter((charge) => charge.id !== chosen.id)]
  }
  /**
   * Spreads an amount across charges, oldest first, capped at each charge's outstanding balance.
   * Returns the whole ledger with the paid amounts applied.
   */
  private distribute(charges: DuesCharge[], ordered: DuesCharge[], amount: number): DuesCharge[] {
    const byId = new Map(charges.map((charge) => [charge.id, { ...charge }]))
    let remaining = round2(amount)
    for (const target of ordered) {
      if (remaining <= 0) break
      const charge = byId.get(target.id)
      if (!charge) continue
      const owed = outstandingOf(charge)
      if (owed <= 0) continue
      const take = round2(Math.min(owed, remaining))
      byId.set(charge.id, {
        ...charge,
        paidAmount: round2(charge.paidAmount + take),
      })
      remaining = round2(remaining - take)
    }
    return [...byId.values()]
  }
  private async debitMemberWallet(
    plan: DuesPlan,
    participant: DuesParticipant,
    amount: number,
    ctx: MutationContext,
  ): Promise<void> {
    const wallet = await walletService.ensureMemberWallet(
      { memberId: participant.memberId, memberName: participant.memberName },
      ctx.actor,
    )
    await walletService.spend(
      {
        walletId: wallet.id,
        amount,
        type: "Dues",
        kind: "Withdrawal",
        description: `${plan.name} — dues payment`,
        reference: `dues:${plan.id}:${participant.id}`,
        counterparty: participant.memberName,
        related: {
          duesId: plan.id,
          duesName: plan.name,
          memberName: participant.memberName,
        },
      },
      ctx.actor,
      ctx.mode,
    )
  }
  private recoveryTransaction(
    dataset: DuesDataset,
    charge: DuesCharge,
    amount: number,
    ctx: MutationContext,
    status: DuesTransaction["status"],
    note?: string,
  ): DuesTransaction {
    const participant = dataset.participants.find((candidate) => candidate.id === charge.participantId)
    const plan = dataset.plans.find((candidate) => candidate.id === charge.duesPlanId)
    return {
      id: nextId("dtx"),
      organizationId: charge.organizationId,
      reference: reference(),
      duesPlanId: charge.duesPlanId,
      participantId: charge.participantId,
      memberId: charge.memberId,
      memberName: participant?.memberName ?? charge.memberId,
      chargeId: charge.id,
      periodKey: charge.periodKey,
      type: "Wallet recovery",
      method: "wallet",
      amount,
      direction: "credit",
      status,
      date: now(),
      recordedBy: ctx.actor.name,
      note: note ?? plan?.name,
      simulated: isSimulated(ctx),
    }
  }
}
export const duesService = new DuesService()
