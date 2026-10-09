import { describe, expect, it } from "vitest"
import { buildDuesDataset, DUES_PLAN_IDS } from "../mocks/dues.mock"
import {
  collectionHistory,
  filterCharges,
  filterTransactions,
  manualPaymentRows,
  memberPaymentHistory,
  outstandingRows,
  overdueRows,
  planPerformance,
  walletRecoveryRows,
} from "./reporting"
import { round2 } from "./schedule"
const TODAY = "2026-06-01"
const data = buildDuesDataset({ today: TODAY })
describe("the mock ledger", () => {
  it("keeps the charge ledger and the transaction log in agreement", () => {
    const paidOnCharges = round2(data.charges.reduce((sum, charge) => sum + charge.paidAmount, 0))
    const recorded = round2(data.transactions.reduce((sum, transaction) => sum + transaction.amount, 0))
    expect(recorded).toBeGreaterThan(0)
    expect(recorded).toBe(paidOnCharges)
  })
  it("seeds a claim, a part payment and a paid-up member", () => {
    const states = new Set(data.charges.map((charge) => charge.state))
    expect(states.has("Overdue")).toBe(true)
    expect(states.has("Paid")).toBe(true)
    expect(data.charges.some((charge) => charge.paidAmount > 0 && charge.paidAmount < charge.expectedAmount)).toBe(true)
  })
})
describe("plan performance", () => {
  it("reports one row per plan", () => {
    const rows = planPerformance(data, TODAY)
    expect(rows.map((row) => row.duesPlanId).sort()).toEqual([...Object.values(DUES_PLAN_IDS)].sort())
    expect(rows.every((row) => row.amount === row.paid)).toBe(true)
  })
  it("reports collected and outstanding for the plan the filter names", () => {
    const rows = filterCharges(data, { duesPlanId: DUES_PLAN_IDS.annual }, TODAY)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((charge) => charge.duesPlanId === DUES_PLAN_IDS.annual)).toBe(true)
  })
})
describe("collection history", () => {
  it("groups money received by month, newest first", () => {
    const rows = collectionHistory(data, {}, undefined)
    expect(rows.length).toBeGreaterThan(1)
    const months = rows.map((row) => row.label)
    expect([...months].sort((a, b) => b.localeCompare(a))).toEqual(months)
    expect(rows.every((row) => row.count && row.count > 0)).toBe(true)
  })
  it("narrows to one plan", () => {
    const all = collectionHistory(data, {}, undefined).reduce((sum, row) => sum + row.amount, 0)
    const one = collectionHistory(data, { duesPlanId: DUES_PLAN_IDS.weekly }, undefined).reduce(
      (sum, row) => sum + row.amount,
      0,
    )
    expect(one).toBeGreaterThan(0)
    expect(one).toBeLessThan(all)
  })
})
describe("who still owes", () => {
  it("lists only participants with something payable now", () => {
    const rows = outstandingRows(data, {}, TODAY, undefined)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.outstanding > 0)).toBe(true)
    const names = rows.map((row) => row.memberName)
    expect(names).toContain("Chinedu Okafor")
    // Adewale cleared every monthly charge, so he never appears for that plan.
    const monthly = outstandingRows(data, { duesPlanId: DUES_PLAN_IDS.monthly }, TODAY, undefined)
    expect(monthly.map((row) => row.memberName)).not.toContain("Adewale Johnson")
  })
  it("filters by group through the member ids the caller resolved", () => {
    const others = outstandingRows(data, {}, TODAY, undefined)
    const scoped = outstandingRows(data, {}, TODAY, ["LFC-002479"])
    expect(others.length).toBeGreaterThan(scoped.length)
    expect(scoped.every((row) => row.memberName === "Chinedu Okafor")).toBe(true)
  })
  it("lists individual charges that are past their due date", () => {
    const rows = overdueRows(data, {}, TODAY, undefined)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.outstanding > 0 && (row.dueDate ?? "") <= TODAY)).toBe(true)
  })
  it("filters by amount and by status", () => {
    const big = filterCharges(data, { minAmount: 20000 }, TODAY)
    expect(big.every((charge) => charge.expectedAmount >= 20000)).toBe(true)
    expect(big.length).toBeGreaterThan(0)
    const awaiting = filterCharges(data, { status: "Awaiting wallet recovery" }, TODAY)
    expect(awaiting.length).toBeGreaterThan(0)
    // Only the plans that carry a lien can raise a claim.
    expect(awaiting.every((charge) => charge.duesPlanId !== DUES_PLAN_IDS.weekly)).toBe(true)
  })
})
describe("wallet recoveries and manual payments", () => {
  it("separates what the wallet took from what an administrator recorded", () => {
    const recovered = walletRecoveryRows(data, {}, undefined)
    expect(recovered.length).toBeGreaterThan(0)
    expect(recovered.every((row) => row.method === "wallet")).toBe(true)
    // The row names the plan the money was collected for.
    expect(recovered.every((row) => Boolean(row.duesPlanName))).toBe(true)
    const manual = manualPaymentRows(data, {}, undefined)
    expect(manual.length).toBeGreaterThan(0)
    expect(manual.every((row) => row.method === "cash" || row.method === "bank_transfer")).toBe(true)
    const filtered = filterTransactions(data, { method: "cash" }, undefined)
    expect(filtered.every((transaction) => transaction.method === "cash")).toBe(true)
  })
})
describe("member payment history", () => {
  it("returns one member's dues movements, newest first", () => {
    const rows = memberPaymentHistory(data, "LFC-002479")
    expect(rows.length).toBeGreaterThan(0)
    const dates = rows.map((row) => row.dueDate ?? "")
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates)
    expect(memberPaymentHistory(data, "LFC-999999")).toHaveLength(0)
  })
})
