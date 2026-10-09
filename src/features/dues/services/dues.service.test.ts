import { describe, expect, it } from "vitest"
import { buildDuesDataset, DUES_PLAN_IDS } from "../mocks/dues.mock"
import { createMockDuesRepository } from "../repositories/mock-dues.repository"
import { DuesService, type MutationContext } from "./dues.service"
import { outstandingOf } from "../domain/dues.rules"
import { addDays, round2, toISODate } from "../domain/schedule"
import { memberWalletFor } from "@/features/wallet/domain/wallet.rules"
import { walletService } from "@/features/wallet/services/wallet.service"
import type { CreateDuesPlanInput, DuesCharge, DuesDataset } from "../types/dues.types"
const organizationId = "org-lagos-farmers"
const ada: MutationContext = {
  actor: { id: "admin-ada", name: "Ada Obi" },
  mode: "live",
}
const today = toISODate(new Date())
const daysAgo = (days: number) => toISODate(addDays(new Date(), -days))
const buildService = () => new DuesService(createMockDuesRepository(buildDuesDataset()))
/** What is payable now across a set of charges. */
const owedWhere = (dataset: DuesDataset, predicate: (charge: DuesCharge) => boolean) =>
  round2(
    dataset.charges
      .filter(predicate)
      .filter((charge) => charge.dueDate <= today)
      .reduce((sum, charge) => sum + outstandingOf(charge), 0),
  )
const walletFor = async (memberId: string) => {
  const data = await walletService.load()
  return memberWalletFor(data.wallets, memberId)
}
const MONTHLY = DUES_PLAN_IDS.monthly
const MONTHLY_CHINEDU = `${MONTHLY}:LFC-002479`
const planInput = (overrides: Partial<CreateDuesPlanInput> = {}): CreateDuesPlanInput => ({
  name: "Welfare Dues",
  amount: 1000,
  frequency: "Monthly",
  startDate: daysAgo(60),
  scope: "Selected",
  roster: [
    { memberId: "LFC-002481", memberName: "Adewale Johnson" },
    { memberId: "LFC-002479", memberName: "Chinedu Okafor" },
  ],
  lien: { enabled: true, graceDays: 5, autoRecover: true },
  ...overrides,
})
describe("creating a dues plan", () => {
  it("creates an active plan with a roster and a charge ledger", async () => {
    const service = buildService()
    const created = await service.createPlan(organizationId, planInput(), ada)
    expect(created.status).toBe("Active")
    expect(created.createdBy).toBe("Ada Obi")
    const dataset = await service.load(organizationId)
    expect(dataset.plans.some((plan) => plan.id === created.id)).toBe(true)
    const roster = dataset.participants.filter((participant) => participant.duesPlanId === created.id)
    expect(roster).toHaveLength(2)
    const ledger = dataset.charges.filter((charge) => charge.duesPlanId === created.id)
    expect(ledger.length).toBeGreaterThan(0)
    expect(ledger.every((charge) => charge.expectedAmount === 1000)).toBe(true)
    // Charges already due and unpaid carry a claim; charges ahead of us do not.
    expect(ledger.some((charge) => charge.state === "Overdue")).toBe(true)
    expect(ledger.some((charge) => charge.dueDate > today)).toBe(true)
  })
  it("stores the roster's branch so a participant row can name it", async () => {
    const service = buildService()
    const created = await service.createPlan(
      organizationId,
      planInput({
        roster: [
          {
            memberId: "LFC-002462",
            memberName: "Fatima Bello",
            memberCode: "LFC-002462",
            branchId: "branch-epe",
            branchName: "Epe",
          },
        ],
      }),
      ada,
    )
    const participant = (await service.load(organizationId)).participants.find((row) => row.duesPlanId === created.id)
    expect(participant?.memberName).toBe("Fatima Bello")
    expect(participant?.branchName).toBe("Epe")
    expect(participant?.memberCode).toBe("LFC-002462")
  })
})
describe("recording a payment", () => {
  it("settles the oldest dues first and refuses more than is owed", async () => {
    const service = buildService()
    const before = await service.load(organizationId)
    const mine = (charge: DuesCharge) => charge.participantId === MONTHLY_CHINEDU
    const owedBefore = owedWhere(before, mine)
    expect(owedBefore).toBeGreaterThan(3000)
    await expect(
      service.recordPayment(
        organizationId,
        {
          duesPlanId: MONTHLY,
          participantId: MONTHLY_CHINEDU,
          amount: owedBefore + 1000,
          method: "cash",
        },
        ada,
      ),
    ).rejects.toThrow(/more than this member owes/)
    const transaction = await service.recordPayment(
      organizationId,
      {
        duesPlanId: MONTHLY,
        participantId: MONTHLY_CHINEDU,
        amount: 2500,
        method: "cash",
      },
      ada,
    )
    expect(transaction?.method).toBe("cash")
    expect(transaction?.type).toBe("Payment")
    const after = await service.load(organizationId)
    expect(owedWhere(after, mine)).toBe(round2(owedBefore - 2500))
    // The ledger and the transaction log always agree.
    expect(round2(after.transactions.reduce((sum, row) => sum + row.amount, 0))).toBe(
      round2(after.charges.reduce((sum, charge) => sum + charge.paidAmount, 0)),
    )
  })
  it("debits the member's wallet exactly once when they pay by wallet", async () => {
    const service = buildService()
    const memberId = "LFC-002479"
    const before = (await walletFor(memberId))!
    const owedBefore = owedWhere(
      await service.load(organizationId),
      (charge) => charge.participantId === MONTHLY_CHINEDU,
    )
    const transaction = await service.recordPayment(
      organizationId,
      {
        duesPlanId: MONTHLY,
        participantId: MONTHLY_CHINEDU,
        amount: 1000,
        method: "wallet",
      },
      ada,
    )
    expect(transaction?.method).toBe("wallet")
    const after = (await walletFor(memberId))!
    expect(after.availableBalance).toBe(round2(before.availableBalance - 1000))
    const dataset = await service.load(organizationId)
    expect(owedWhere(dataset, (charge) => charge.participantId === MONTHLY_CHINEDU)).toBe(round2(owedBefore - 1000))
  })
  it("records nothing when the member owes nothing on that plan", async () => {
    const service = buildService()
    const created = await service.createPlan(
      organizationId,
      planInput({
        name: "Future Only Dues",
        startDate: toISODate(addDays(new Date(), 30)),
      }),
      ada,
    )
    const transaction = await service.recordPayment(
      organizationId,
      {
        duesPlanId: created.id,
        participantId: `${created.id}:LFC-002481`,
        amount: 500,
        method: "cash",
      },
      ada,
    )
    expect(transaction).toBeUndefined()
  })
})
describe("wallet lien recovery", () => {
  it("takes what the wallet can pay, leaves the rest owing, and never takes twice", async () => {
    const service = buildService()
    const memberId = "LFC-002462"
    const created = await service.createPlan(
      organizationId,
      planInput({
        name: "Building Levy",
        amount: 40000,
        startDate: daysAgo(100),
        roster: [{ memberId, memberName: "Fatima Bello" }],
        lien: { enabled: true, graceDays: 0, autoRecover: true },
      }),
      ada,
    )
    const walletBefore = (await walletFor(memberId))!
    expect(walletBefore.availableBalance).toBeGreaterThan(0)
    const owedBefore = owedWhere(await service.load(organizationId), (charge) => charge.duesPlanId === created.id)
    expect(owedBefore).toBeGreaterThan(walletBefore.availableBalance)
    const first = await service.runLienRecovery(organizationId, ada, {
      memberId,
      planId: created.id,
    })
    expect(first.recovered).toBe(walletBefore.availableBalance)
    expect(first.membersTouched).toBe(1)
    expect((await walletFor(memberId))!.availableBalance).toBe(0)
    const after = await service.load(organizationId)
    expect(owedWhere(after, (charge) => charge.duesPlanId === created.id)).toBe(
      round2(owedBefore - walletBefore.availableBalance),
    )
    // Nothing left to collect, so a second run is a no-op — no duplicate deduction.
    const second = await service.runLienRecovery(organizationId, ada, {
      memberId,
      planId: created.id,
    })
    expect(second.recovered).toBe(0)
    expect((await walletFor(memberId))!.availableBalance).toBe(0)
  })
  it("starts collecting automatically as soon as a member's wallet is credited", async () => {
    const service = buildService()
    const memberId = "LFC-002426" // only on the annual plan, which recovers manually — so this plan is the only claim
    const created = await service.createPlan(
      organizationId,
      planInput({
        name: "Automatic Welfare",
        amount: 30000,
        startDate: daysAgo(40),
        roster: [{ memberId, memberName: "Bisi Adebayo" }],
        lien: { enabled: true, graceDays: 0, autoRecover: true },
      }),
      ada,
    )
    const walletBefore = (await walletFor(memberId))!
    const owedBefore = owedWhere(await service.load(organizationId), (charge) => charge.duesPlanId === created.id)
    expect(owedBefore).toBeGreaterThan(walletBefore.availableBalance)
    const unsubscribe = service.startAutoRecovery(organizationId, "simulated")
    try {
      await walletService.fund(
        {
          walletId: walletBefore.id,
          amount: 12000,
          method: "Bank transfer",
          reference: "Top up",
          senderName: "Test",
        },
        ada.actor,
        "simulated",
      )
      const settle = async (check: () => Promise<boolean>, tries = 40) => {
        for (let attempt = 0; attempt < tries; attempt += 1) {
          if (await check()) return true
          await new Promise((resolve) => setTimeout(resolve, 25))
        }
        return false
      }
      const drained = await settle(async () => (await walletFor(memberId))!.availableBalance === 0)
      expect(drained).toBe(true)
      const owedAfter = owedWhere(await service.load(organizationId), (charge) => charge.duesPlanId === created.id)
      expect(owedAfter).toBe(round2(owedBefore - walletBefore.availableBalance - 12000))
    } finally {
      unsubscribe()
    }
  })
})
describe("what a lien may collect", () => {
  it("collects nothing when the plan tracks dues without a lien or without automatic recovery", async () => {
    const service = buildService()
    // The weekly levy tracks dues but carries no lien.
    const tracked = await service.runLienRecovery(organizationId, ada, {
      memberId: "LFC-002479",
      planId: DUES_PLAN_IDS.weekly,
    })
    expect(tracked.recovered).toBe(0)
    // The annual plan carries a lien but recovers only when an administrator asks.
    const manual = await service.runLienRecovery(organizationId, ada, {
      memberId: "LFC-002462",
      planId: DUES_PLAN_IDS.annual,
    })
    expect(manual.recovered).toBe(0)
  })
  it("changing the lien rules re-judges the outstanding charges", async () => {
    const service = buildService()
    const before = await service.load(organizationId)
    expect(before.charges.some((charge) => charge.duesPlanId === MONTHLY && charge.lienState === "Pending")).toBe(true)
    const updated = await service.updateLienRules(organizationId, MONTHLY, {
      enabled: true,
      graceDays: 365,
      autoRecover: true,
    })
    expect(updated?.lien.graceDays).toBe(365)
    // With a year of grace nothing is late any more, so recovery has nothing to collect.
    const recovery = await service.runLienRecovery(organizationId, ada, {
      planId: MONTHLY,
    })
    expect(recovery.recovered).toBe(0)
  })
  it("leaves a charge outstanding and records the reason when a wallet limit refuses the deduction", async () => {
    const service = buildService()
    const memberId = "LFC-002438"
    // Fund the wallet well past the member wallet's single-transaction limit, so a large levy is
    // affordable but still refused by the limit — the charge must stay outstanding.
    const wallet = (await walletFor(memberId))!
    await walletService.fund(
      {
        walletId: wallet.id,
        amount: 1000000,
        method: "Bank transfer",
        reference: "Test funding",
        senderName: "Test",
      },
      ada.actor,
      "simulated",
    )
    const created = await service.createPlan(
      organizationId,
      planInput({
        name: "Large Levy",
        amount: 900000,
        startDate: daysAgo(40),
        roster: [{ memberId, memberName: "Ibrahim Musa" }],
        lien: { enabled: true, graceDays: 0, autoRecover: true },
      }),
      ada,
    )
    const before = (await walletFor(memberId))!.availableBalance
    const owedBefore = owedWhere(await service.load(organizationId), (charge) => charge.duesPlanId === created.id)
    const result = await service.runLienRecovery(organizationId, ada, {
      memberId,
      planId: created.id,
    })
    expect(result.recovered).toBe(0)
    expect((await walletFor(memberId))!.availableBalance).toBe(before)
    const dataset = await service.load(organizationId)
    expect(owedWhere(dataset, (charge) => charge.duesPlanId === created.id)).toBe(owedBefore)
    const due = dataset.charges.filter((charge) => charge.duesPlanId === created.id && charge.dueDate <= today)
    expect(due.length).toBeGreaterThan(0)
    expect(due.every((charge) => charge.state === "Overdue" && charge.paidAmount === 0)).toBe(true)
    const failed = dataset.transactions.filter((row) => row.status === "Failed")
    expect(failed.length).toBeGreaterThan(0)
    expect(failed[0].note).toMatch(/Within single-transaction limit/)
  })
})
describe("plan status", () => {
  it("closing a plan stops future dues but keeps what is owed", async () => {
    const service = buildService()
    const before = await service.load(organizationId)
    const futureBefore = before.charges.filter((charge) => charge.duesPlanId === MONTHLY && charge.dueDate > today)
    expect(futureBefore.length).toBeGreaterThan(0)
    const owedBefore = owedWhere(before, (charge) => charge.duesPlanId === MONTHLY)
    const closed = await service.setStatus(organizationId, MONTHLY, "Closed")
    expect(closed?.status).toBe("Closed")
    const after = await service.load(organizationId)
    expect(after.charges.filter((charge) => charge.duesPlanId === MONTHLY && charge.dueDate > today)).toHaveLength(0)
    expect(owedWhere(after, (charge) => charge.duesPlanId === MONTHLY)).toBe(owedBefore)
    expect(after.plans.find((plan) => plan.id === MONTHLY)?.status).toBe("Closed")
  })
  it("pausing a plan keeps its ledger but stops new claims", async () => {
    const service = buildService()
    await service.setStatus(organizationId, MONTHLY, "Paused")
    const after = await service.load(organizationId)
    const owed = after.charges
      .filter((charge) => charge.duesPlanId === MONTHLY)
      .filter((charge) => charge.dueDate <= today)
    expect(after.plans.find((plan) => plan.id === MONTHLY)?.status).toBe("Paused")
    expect(owed.length).toBeGreaterThan(0)
    // The ledger survives untouched, but a paused plan takes on no new claim and collects nothing.
    expect(owed.every((charge) => charge.state !== "Paid" || charge.paidAmount > 0)).toBe(true)
    const recovery = await service.runLienRecovery(organizationId, ada, {
      planId: MONTHLY,
    })
    expect(recovery.recovered).toBe(0)
  })
})
