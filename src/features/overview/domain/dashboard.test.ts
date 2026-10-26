import { describe, expect, it } from "vitest"
import {
  attentionItems,
  dashboardMetrics,
  eyebrowFor,
  formatNaira,
  greetingFor,
  isEmptyCommunity,
  type DashboardInput,
} from "./dashboard"

const input = (over: Partial<DashboardInput> = {}): DashboardInput => ({
  customerCount: 0,
  customersAwaitingApproval: 0,
  activeLoans: 0,
  overdueLoans: 0,
  totalApplications: 0,
  pendingApplications: 0,
  totalDisbursed: 0,
  totalRepaid: 0,
  repaymentRate: 0,
  activeEsusu: 0,
  esusuCollected: 0,
  walletApprovalsPending: 0,
  staffAwaitingSetup: 0,
  walletConnected: true,
  latestCustomers: [],
  ...over,
})

describe("dashboard metrics", () => {
  it("counts what the MFI actually has", () => {
    const metrics = dashboardMetrics(
      input({ customerCount: 8, activeLoans: 5, overdueLoans: 2, pendingApplications: 3, totalApplications: 12 }),
    )
    const byId = Object.fromEntries(metrics.map((metric) => [metric.id, metric]))

    expect(byId.customers.value).toBe("8")
    expect(byId["active-loans"].value).toBe("5")
    expect(byId["active-loans"].detail).toBe("2 overdue")
    expect(byId["pending-applications"].detail).toBe("12 total applications")
  })

  it("says so when nothing is waiting rather than inventing a queue", () => {
    const metrics = dashboardMetrics(input())
    const byId = Object.fromEntries(metrics.map((metric) => [metric.id, metric]))

    expect(byId.customers.detail).toBe("None awaiting approval")
    expect(byId.customers.value).toBe("0")
  })

  it("formats money amounts for the disbursed and repaid cards", () => {
    const metrics = dashboardMetrics(input({ totalDisbursed: 1250000, totalRepaid: 750000, repaymentRate: 60 }))
    const byId = Object.fromEntries(metrics.map((metric) => [metric.id, metric]))

    expect(byId.disbursed.value).toBe(formatNaira(1250000))
    expect(byId.disbursed.detail).toBe("60% repaid")
    expect(byId.repaid.value).toBe(formatNaira(750000))
  })

  it("leads every card somewhere", () => {
    for (const metric of dashboardMetrics(input())) {
      expect(metric.target).toBeTruthy()
    }
  })
})

describe("attention items", () => {
  it("is empty for a community with nothing outstanding", () => {
    expect(attentionItems(input())).toEqual([])
  })

  it("raises only the items a record backs", () => {
    const items = attentionItems(input({ customersAwaitingApproval: 2, walletConnected: false }))

    expect(items.map((item) => item.id)).toEqual(["customers", "corporate"])
    expect(items[0].label).toBe("2 people are waiting on approval")
    expect(items[0].target).toBe("members")
    expect(items[1].label).toBe("Corporate wallet not connected")
  })

  it("counts an unconnected wallet and pending withdrawals once each", () => {
    const items = attentionItems(input({ walletConnected: false, walletApprovalsPending: 3 }))

    expect(items).toHaveLength(2)
    expect(items.find((item) => item.id === "wallet")?.label).toBe("3 wallet withdrawal approvals pending")
    expect(items.find((item) => item.id === "corporate")?.label).toBe("Corporate wallet not connected")
  })

  it("reads a single record in the singular", () => {
    const items = attentionItems(input({ staffAwaitingSetup: 1, pendingApplications: 1 }))

    expect(items.find((item) => item.id === "staff")?.label).toBe("1 staff member hasn’t completed setup")
    expect(items.find((item) => item.id === "loans")?.label).toBe("1 loan application is awaiting review")
  })
})

describe("an empty community", () => {
  it("is the one with no records at all", () => {
    expect(isEmptyCommunity(input())).toBe(true)
    expect(isEmptyCommunity(input({ activeLoans: 1 }))).toBe(false)
    expect(isEmptyCommunity(input({ totalApplications: 2 }))).toBe(false)
    expect(isEmptyCommunity(input({ activeEsusu: 1 }))).toBe(false)
  })
})

describe("the date and the greeting", () => {
  it("greets by the time of day", () => {
    expect(greetingFor(8)).toBe("Good morning")
    expect(greetingFor(14)).toBe("Good afternoon")
    expect(greetingFor(21)).toBe("Good evening")
  })

  it("formats a real date rather than a written-in one", () => {
    expect(eyebrowFor(new Date("2026-10-13T09:00:00"))).toBe("TUESDAY, 13 OCTOBER")
  })
})
