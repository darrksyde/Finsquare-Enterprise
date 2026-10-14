import { describe, expect, it } from "vitest"
import {
  attentionItems,
  dashboardMetrics,
  eyebrowFor,
  greetingFor,
  isEmptyCommunity,
  type DashboardInput,
} from "./dashboard"

const input = (over: Partial<DashboardInput> = {}): DashboardInput => ({
  memberCount: 0,
  membersAwaitingApproval: 0,
  groupCount: 0,
  branchCount: 0,
  activeContributions: 0,
  contributionCollected: "₦0",
  duesOutstanding: "₦0",
  membersWithArrears: 0,
  loanApplications: 0,
  loanApplicationsAwaitingReview: 0,
  walletApprovalsPending: 0,
  administratorsAwaitingSetup: 0,
  applicationsAwaitingReview: 0,
  corporateAccountConnected: true,
  complianceDocumentsOutstanding: 0,
  ...over,
})

describe("dashboard metrics", () => {
  it("counts what the community actually has", () => {
    const metrics = dashboardMetrics(input({ memberCount: 8, groupCount: 3, branchCount: 2, activeContributions: 1 }))
    const byId = Object.fromEntries(metrics.map((metric) => [metric.id, metric]))

    expect(byId.members.value).toBe("8")
    expect(byId.groups.value).toBe("3")
    expect(byId.groups.detail).toBe("Across 2 branches")
    expect(byId.contributions.value).toBe("1")
  })

  it("says so when nothing is waiting rather than inventing a queue", () => {
    const metrics = dashboardMetrics(input())
    const byId = Object.fromEntries(metrics.map((metric) => [metric.id, metric]))

    expect(byId.members.detail).toBe("None awaiting approval")
    expect(byId.dues.detail).toBe("Nothing outstanding")
    expect(byId.members.value).toBe("0")
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
    const items = attentionItems(
      input({ membersAwaitingApproval: 2, applicationsAwaitingReview: 3, corporateAccountConnected: false }),
    )

    expect(items.map((item) => item.id)).toEqual(["members", "corporate"])
    expect(items[0].label).toBe("5 people are waiting on approval")
    expect(items[0].target).toBe("member-applications")
    expect(items[1].label).toBe("Corporate account not connected")
  })

  it("counts an unconnected corporate account and outstanding compliance once each", () => {
    const items = attentionItems(
      input({ corporateAccountConnected: false, complianceDocumentsOutstanding: 4, walletApprovalsPending: 1 }),
    )

    expect(items).toHaveLength(3)
    expect(items.find((item) => item.id === "compliance")?.label).toBe("4 compliance documents are outstanding")
    expect(items.find((item) => item.id === "wallet")?.label).toBe("1 wallet approval pending")
  })

  it("reads a single record in the singular", () => {
    const items = attentionItems(input({ administratorsAwaitingSetup: 1, applicationsAwaitingReview: 1 }))

    expect(items.find((item) => item.id === "administrators")?.label).toBe("1 administrator hasn’t completed setup")
    expect(items.find((item) => item.id === "members")?.label).toBe("1 person is waiting on approval")
  })
})

describe("an empty community", () => {
  it("is the one with no records at all", () => {
    expect(isEmptyCommunity(input())).toBe(true)
    expect(isEmptyCommunity(input({ branchCount: 1 }))).toBe(false)
    expect(isEmptyCommunity(input({ loanApplications: 2 }))).toBe(false)
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
