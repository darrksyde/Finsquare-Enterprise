import { describe, expect, it } from "vitest"
import {
  addMonths,
  chargeState,
  daysBetween,
  frequencyLabel,
  generateCharges,
  nextDueDateFor,
  parseISODate,
  periodKeyFor,
  toISODate,
} from "./schedule"
import type { DuesPlan } from "../types/dues.types"
function plan(overrides: Partial<DuesPlan> = {}): DuesPlan {
  return {
    id: "dues-1",
    organizationId: "org-test",
    name: "Monthly Association Dues",
    amount: 2000,
    currency: "NGN",
    frequency: "Monthly",
    startDate: "2026-01-31",
    scope: "All",
    lien: { enabled: true, graceDays: 7, autoRecover: true },
    status: "Active",
    createdAt: "2026-01-01T00:00:00.000Z",
    createdBy: "Ada Obi",
    ...overrides,
  }
}
describe("addMonths", () => {
  it("clamps to the last day of the target month instead of overflowing", () => {
    // 31 January + 1 month must be 28 February, not 3 March (the contribution schedule bug).
    expect(toISODate(addMonths(parseISODate("2026-01-31"), 1))).toBe("2026-02-28")
    expect(toISODate(addMonths(parseISODate("2026-01-31"), 2))).toBe("2026-03-31")
    expect(toISODate(addMonths(parseISODate("2024-01-31"), 2))).toBe("2024-03-31")
    expect(toISODate(addMonths(parseISODate("2024-02-29"), 12))).toBe("2025-02-28")
  })
})
describe("chargeState", () => {
  it("judges a charge from what was expected, what was paid and the due date", () => {
    expect(chargeState(2000, 2000, "2026-01-01", "2026-02-01")).toBe("Paid")
    expect(chargeState(2000, 3000, "2026-01-01", "2026-02-01")).toBe("Paid")
    expect(chargeState(2000, 0, "2026-03-01", "2026-02-01")).toBe("Pending")
    expect(chargeState(2000, 500, "2026-03-01", "2026-02-01")).toBe("Partially Paid")
    expect(chargeState(2000, 0, "2026-01-01", "2026-02-01")).toBe("Overdue")
    expect(chargeState(2000, 500, "2026-01-01", "2026-02-01")).toBe("Overdue")
  })
})
describe("periodKeyFor", () => {
  it("gives one key per calendar period for the frequency", () => {
    const date = parseISODate("2026-10-04")
    expect(periodKeyFor(date, "Daily")).toBe("2026-10-04")
    expect(periodKeyFor(date, "Monthly")).toBe("2026-10")
    expect(periodKeyFor(date, "Quarterly")).toBe("2026-10")
    expect(periodKeyFor(date, "Yearly")).toBe("2026")
    expect(periodKeyFor(date, "Weekly")).toMatch(/^2026-W\d{2}$/)
  })
})
describe("the schedule", () => {
  it("steps monthly/quarterly/yearly from the start date", () => {
    expect(toISODate(nextDueDateFor(plan({ frequency: "Monthly" }), 2))).toBe("2026-03-31")
    expect(toISODate(nextDueDateFor(plan({ frequency: "Quarterly" }), 1))).toBe("2026-04-30")
    expect(toISODate(nextDueDateFor(plan({ frequency: "Yearly" }), 1))).toBe("2027-01-31")
    expect(toISODate(nextDueDateFor(plan({ frequency: "Weekly" }), 2))).toBe("2026-02-14")
  })
  it("uses a custom interval when the frequency is Custom", () => {
    const custom = plan({
      frequency: "Custom",
      startDate: "2026-01-01",
      customFrequency: { label: "Every 10 days", days: 10 },
    })
    expect(toISODate(nextDueDateFor(custom, 3))).toBe("2026-01-31")
    expect(frequencyLabel(custom)).toBe("Every 10 days")
  })
  it("generates one charge for a One-time plan", () => {
    const charges = generateCharges(
      plan({ frequency: "One-time", startDate: "2026-02-01" }),
      [{ id: "p1", memberId: "m1" }],
      "2026-01-15",
    )
    expect(charges).toHaveLength(1)
    expect(charges[0].dueDate).toBe("2026-02-01")
    expect(charges[0].state).toBe("Pending")
    expect(charges[0].lienState).toBe("None")
  })
  it("stops at the end date when the plan has one", () => {
    const charges = generateCharges(
      plan({
        frequency: "Monthly",
        startDate: "2026-01-01",
        endDate: "2026-03-01",
      }),
      [{ id: "p1", memberId: "m1" }],
      "2026-01-05",
    )
    expect(charges.map((charge) => charge.dueDate)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"])
  })
  it("generates a rolling horizon for a plan that has no end date", () => {
    const charges = generateCharges(
      plan({ frequency: "Monthly", startDate: "2026-01-01" }),
      [{ id: "p1", memberId: "m1" }],
      "2026-06-01",
    )
    // Monthly charges from the start date up to a year past today.
    expect(charges.length).toBe(18)
    expect(charges[0].dueDate).toBe("2026-01-01")
    expect(charges.every((charge) => daysBetween(parseISODate("2026-01-01"), parseISODate(charge.dueDate)) >= 0)).toBe(
      true,
    )
  })
  it("gives every participant their own charge per period", () => {
    const charges = generateCharges(
      plan({ frequency: "One-time" }),
      [
        { id: "p1", memberId: "m1" },
        { id: "p2", memberId: "m2" },
      ],
      "2026-01-15",
    )
    expect(charges).toHaveLength(2)
    expect(new Set(charges.map((charge) => charge.participantId))).toEqual(new Set(["p1", "p2"]))
  })
})
