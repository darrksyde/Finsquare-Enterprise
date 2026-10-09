import { describe, expect, it } from "vitest"
import {
  amountLabel,
  chargeStatus,
  effectiveLienState,
  lienRecoverable,
  lienRulesLabel,
  outstandingOf,
  participantTotals,
  planTotals,
  recoveryAllocation,
  scopeLabel,
  summarizeDues,
  syncCharge,
} from "./dues.rules"
import type { DuesCharge, DuesDataset, DuesParticipant, DuesPlan } from "../types/dues.types"
const TODAY = "2026-06-01"
function plan(overrides: Partial<DuesPlan> = {}): DuesPlan {
  return {
    id: "dues-1",
    organizationId: "org-test",
    name: "Monthly Association Dues",
    amount: 2000,
    currency: "NGN",
    frequency: "Monthly",
    startDate: "2026-01-01",
    scope: "All",
    lien: { enabled: true, graceDays: 7, autoRecover: true },
    status: "Active",
    createdAt: "2026-01-01T00:00:00.000Z",
    createdBy: "Ada Obi",
    ...overrides,
  }
}
function participant(overrides: Partial<DuesParticipant> = {}): DuesParticipant {
  return {
    id: "p1",
    organizationId: "org-test",
    duesPlanId: "dues-1",
    memberId: "m1",
    memberName: "Adewale Johnson",
    joinedAt: "2026-01-01",
    ...overrides,
  }
}
function charge(overrides: Partial<DuesCharge> = {}): DuesCharge {
  return {
    id: "dues-1:p1:2026-01",
    organizationId: "org-test",
    duesPlanId: "dues-1",
    participantId: "p1",
    memberId: "m1",
    periodKey: "2026-01",
    dueDate: "2026-01-01",
    expectedAmount: 2000,
    paidAmount: 0,
    state: "Overdue",
    lienState: "None",
    ...overrides,
  }
}
describe("lien rules", () => {
  it("applies a lien only after the due date plus the grace period", () => {
    const rules = plan({
      lien: { enabled: true, graceDays: 7, autoRecover: true },
    })
    expect(effectiveLienState(charge({ dueDate: "2026-05-30" }), rules, TODAY)).toBe("None")
    // Seven days after 25 May is exactly 1 June, so the claim is not late yet.
    expect(effectiveLienState(charge({ dueDate: "2026-05-25" }), rules, TODAY)).toBe("None")
    expect(effectiveLienState(charge({ dueDate: "2026-05-20" }), rules, TODAY)).toBe("Pending")
  })
  it("never applies a lien when the plan has it switched off", () => {
    const rules = plan({
      lien: { enabled: false, graceDays: 0, autoRecover: true },
    })
    expect(effectiveLienState(charge(), rules, TODAY)).toBe("None")
    expect(lienRecoverable(charge(), rules, TODAY)).toBe(false)
  })
  it("marks a claim partially recovered once something has been collected", () => {
    const rules = plan()
    expect(effectiveLienState(charge({ paidAmount: 500 }), rules, TODAY)).toBe("Partially recovered")
    // A settled charge is only "Recovered" when a claim had actually been raised on it.
    expect(effectiveLienState(charge({ paidAmount: 2000, lienAppliedAt: "2026-05-27" }), rules, TODAY)).toBe(
      "Recovered",
    )
    expect(effectiveLienState(charge({ paidAmount: 2000 }), rules, TODAY)).toBe("None")
  })
  it("does not take on new claims while the plan is paused", () => {
    expect(effectiveLienState(charge(), plan({ status: "Paused" }), TODAY)).toBe("None")
    expect(
      recoveryAllocation([charge()], 10000, new Map([["dues-1", plan({ status: "Paused" })]]), TODAY),
    ).toHaveLength(0)
  })
  it("requires autoRecover before a charge may be collected automatically", () => {
    const manual = plan({
      lien: { enabled: true, graceDays: 0, autoRecover: false },
    })
    expect(lienRecoverable(charge(), manual, TODAY)).toBe(false)
  })
  it("reads the rules in one line", () => {
    expect(lienRulesLabel({ enabled: false, graceDays: 0, autoRecover: false })).toContain("No wallet lien")
    expect(lienRulesLabel({ enabled: true, graceDays: 7, autoRecover: true })).toContain("7 days after the due date")
    expect(lienRulesLabel({ enabled: true, graceDays: 0, autoRecover: false })).toContain("as soon as it is due")
  })
})
describe("chargeStatus", () => {
  it("reports the five states an administrator has to tell apart", () => {
    const rules = plan({
      lien: { enabled: true, graceDays: 7, autoRecover: true },
    })
    expect(chargeStatus(charge({ paidAmount: 2000, state: "Paid" }), rules, TODAY)).toBe("Paid")
    // Ahead of its due date.
    expect(chargeStatus(charge({ dueDate: "2026-06-15", state: "Pending" }), rules, TODAY)).toBe("Pending")
    // Partly paid, but not late yet.
    expect(
      chargeStatus(
        charge({
          paidAmount: 500,
          dueDate: "2026-06-15",
          state: "Partially Paid",
        }),
        rules,
        TODAY,
      ),
    ).toBe("Partially paid")
    // Late, but still inside the grace period, so no claim has been raised.
    expect(chargeStatus(charge({ dueDate: "2026-05-30", state: "Overdue" }), rules, TODAY)).toBe("Overdue")
    // Late past the grace period: the wallet owes it.
    expect(chargeStatus(charge({ dueDate: "2026-05-20", state: "Overdue" }), rules, TODAY)).toBe(
      "Awaiting wallet recovery",
    )
  })
  it("keeps a claim that was already applied, even if the plan is paused afterwards", () => {
    const applied = charge({
      dueDate: "2026-05-20",
      lienAppliedAt: "2026-05-27",
    })
    expect(syncCharge(applied, plan({ status: "Paused" }), TODAY).lienState).toBe("Pending")
  })
})
describe("recoveryAllocation", () => {
  const plans = new Map([["dues-1", plan()]])
  it("collects the oldest dues first and never more than the balance", () => {
    const charges = [
      charge({ id: "c2", periodKey: "2026-02", dueDate: "2026-02-01" }),
      charge({ id: "c1", periodKey: "2026-01", dueDate: "2026-01-01" }),
      charge({ id: "c3", periodKey: "2026-03", dueDate: "2026-03-01" }),
    ]
    const lines = recoveryAllocation(charges, 5000, plans, TODAY)
    expect(lines.map((line) => [line.charge.id, line.amount])).toEqual([
      ["c1", 2000],
      ["c2", 2000],
      ["c3", 1000],
    ])
  })
  it("never deducts more than the amount owed on a charge", () => {
    const lines = recoveryAllocation([charge({ paidAmount: 1500 })], 10000, plans, TODAY)
    expect(lines).toEqual([
      {
        charge: expect.objectContaining({ id: "dues-1:p1:2026-01" }),
        amount: 500,
      },
    ])
  })
  it("takes nothing from an empty wallet or a settled charge", () => {
    expect(recoveryAllocation([charge()], 0, plans, TODAY)).toHaveLength(0)
    expect(recoveryAllocation([charge({ paidAmount: 2000 })], 10000, plans, TODAY)).toHaveLength(0)
  })
})
describe("totals", () => {
  const p = participant()
  const ledger = [
    charge({
      id: "c1",
      periodKey: "2026-01",
      dueDate: "2026-01-01",
      paidAmount: 2000,
      state: "Paid",
    }),
    charge({
      id: "c2",
      periodKey: "2026-02",
      dueDate: "2026-02-01",
      paidAmount: 500,
      state: "Overdue",
    }),
    charge({
      id: "c3",
      periodKey: "2026-06",
      dueDate: "2026-06-01",
      paidAmount: 0,
      state: "Pending",
    }),
  ]
  it("derives a participant's position from their charges", () => {
    const totals = participantTotals(p, ledger, [plan()], TODAY)
    expect(totals.expected).toBe(6000)
    expect(totals.paid).toBe(2500)
    expect(totals.outstanding).toBe(3500)
    expect(totals.overdueCount).toBe(1)
    expect(totals.paidCount).toBe(1)
  })
  it("reports a participant as awaiting recovery while a claim is live, and behind without one", () => {
    expect(participantTotals(p, ledger, [plan()], TODAY).state).toBe("Awaiting wallet recovery")
    // With no lien, the position speaks for itself: something was paid, so not "Behind".
    expect(
      participantTotals(p, ledger, [plan({ lien: { enabled: false, graceDays: 0, autoRecover: false } })], TODAY).state,
    ).toBe("Partially paid")
    const nothingPaid = [charge({ paidAmount: 0, state: "Overdue" })]
    expect(
      participantTotals(p, nothingPaid, [plan({ lien: { enabled: false, graceDays: 0, autoRecover: false } })], TODAY)
        .state,
    ).toBe("Behind")
    expect(participantTotals(p, ledger, [plan()], TODAY).awaitingRecoveryCount).toBeGreaterThan(0)
  })
  it("reports a participant as paid up once nothing is outstanding", () => {
    const settled = [charge({ paidAmount: 2000, state: "Paid" })]
    expect(participantTotals(p, settled, [plan()], TODAY).state).toBe("Paid up")
  })
  it("gives a plan its collection position", () => {
    const totals = planTotals(plan(), [p], ledger, TODAY)
    expect(totals.collected).toBe(2500)
    expect(totals.outstanding).toBe(3500)
    expect(totals.participants).toBe(1)
    expect(totals.unpaidParticipants).toBe(1)
    expect(totals.overdue).toBe(1500)
  })
  it("summarises the whole module", () => {
    const otherPlan = plan({
      id: "dues-2",
      name: "Weekly Welfare",
      status: "Paused",
    })
    const dataset: DuesDataset = {
      plans: [plan(), otherPlan],
      participants: [p, participant({ id: "p2", memberId: "m2", duesPlanId: "dues-2" })],
      charges: [
        ...ledger,
        charge({
          id: "c4",
          duesPlanId: "dues-2",
          participantId: "p2",
          memberId: "m2",
          dueDate: "2026-05-01",
          state: "Overdue",
        }),
      ],
      transactions: [],
    }
    const summary = summarizeDues(dataset, TODAY)
    expect(summary.totalCollected).toBe(2500)
    expect(summary.outstandingAmount).toBe(5500)
    expect(summary.activePlans).toBe(1)
    expect(summary.totalParticipants).toBe(2)
    expect(summary.unpaidMembers).toBe(2)
    expect(summary.paidMembers).toBe(0)
  })
})
describe("labels", () => {
  it("describes the amount and the audience", () => {
    expect(amountLabel(plan())).toBe("₦2,000 · Monthly")
    expect(scopeLabel(plan(), [])).toBe("All members")
    expect(scopeLabel(plan({ scope: "Group", groupName: "Ikeja Farmers" }), [])).toBe("Group: Ikeja Farmers")
    expect(scopeLabel(plan({ scope: "Branch", branchName: "Ikeja" }), [])).toBe("Branch: Ikeja")
    expect(scopeLabel(plan({ scope: "Selected" }), [participant()])).toBe("1 selected member")
  })
  it("computes what is outstanding from the charge itself", () => {
    expect(outstandingOf(charge({ paidAmount: 750 }))).toBe(1250)
    expect(outstandingOf(charge({ paidAmount: 5000 }))).toBe(0)
  })
})
