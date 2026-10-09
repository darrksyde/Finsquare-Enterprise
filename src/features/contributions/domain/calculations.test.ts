import { describe, expect, it } from "vitest"
import {
  aggregateByPeriod,
  commissionFor,
  contributionBalance,
  generatePeriods,
  payoutBreakdown,
  periodKeyFor,
  periodState,
  weekKey,
} from "./calculations"
import type {
  Contribution,
  ContributionParticipant,
  ContributionTransaction,
  ContributionWithdrawal,
} from "../types/contribution.types"

const organizationId = "org-test"

function contribution(overrides: Partial<Contribution> = {}): Contribution {
  return {
    id: "cont-1",
    organizationId,
    name: "Test Ajo",
    type: "Fixed",
    form: "Personal",
    participantScope: "All",
    fixedAmount: 2_000,
    frequencyBased: true,
    frequency: "Daily",
        startDate: "2026-01-01",
    recipient: { kind: "organization", accountId: "acct-1", label: "Org account" },
    commission: { model: "none" },
    payout: { mode: "manual", approvalThreshold: 100_000 },
    paymentMethods: [],
    status: "Active",
    currency: "NGN",
    createdAt: "2026-01-01T00:00:00.000Z",
    createdBy: "Ada Obi",
    ...overrides,
  }
}

function participant(overrides: Partial<ContributionParticipant> = {}): ContributionParticipant {
  return {
    id: "p-1",
    organizationId,
    contributionId: "cont-1",
    memberName: "Adewale Johnson",
    isExternal: false,
    contact: {},
    expectedAmount: 2_000,
    totalContributed: 0,
    availableBalance: 0,
    missedCount: 0,
    lateCount: 0,
    state: "On track",
    joinedAt: "2026-01-01",
    ...overrides,
  }
}

function credit(overrides: Partial<ContributionTransaction> = {}): ContributionTransaction {
  return {
    id: "tx-1",
    organizationId,
    reference: "CTR-1",
    contributionId: "cont-1",
    participantId: "p-1",
    contributorName: "Adewale Johnson",
    type: "Contribution",
    method: "cash",
    amount: 2_000,
    fee: 0,
    commission: 0,
    netAmount: 2_000,
    direction: "credit",
    status: "Completed",
    date: "2026-01-02",
    recordedBy: "Ada Obi",
    ...overrides,
  }
}

describe("commission", () => {
  it("applies a percentage of the gross balance", () => {
    expect(commissionFor({ model: "percentage", percentage: 5 }, 10_000)).toBe(500)
  })

  it("applies a fixed amount", () => {
    expect(commissionFor({ model: "fixed", fixedAmount: 250 }, 10_000)).toBe(250)
  })

  it("never charges commission when the model is none", () => {
    expect(commissionFor({ model: "none", percentage: 10 }, 10_000)).toBe(0)
  })

  it("caps the percentage at 100% and never exceeds the gross balance", () => {
    expect(commissionFor({ model: "percentage", percentage: 400 }, 1_000)).toBe(1_000)
  })

  it("never charges more than the gross minus fees", () => {
    const commission = commissionFor({ model: "fixed", fixedAmount: 900 }, 1_000, 300)
    expect(commission).toBe(700)
  })
})

describe("payout breakdown", () => {
  it("subtracts commission and fees from the gross balance", () => {
    expect(payoutBreakdown(10_000, 500, 100)).toEqual({ gross: 10_000, commission: 500, fees: 100, net: 9_400 })
  })

  it("never returns a negative net payout", () => {
    expect(payoutBreakdown(1_000, 5_000, 500).net).toBe(0)
  })
})

describe("period state", () => {
  it("marks a fully paid period as Paid", () => {
    expect(periodState(2_000, 2_000, "2026-01-01", "2026-01-02")).toBe("Paid")
  })

  it("marks a partial payment before the due date as Partially Paid", () => {
    expect(periodState(2_000, 500, "2026-01-10", "2026-01-05")).toBe("Partially Paid")
  })

  it("marks a partial payment after the due date as Late, not Missed", () => {
    expect(periodState(2_000, 500, "2026-01-01", "2026-01-20")).toBe("Late")
  })

  it("marks an unpaid past period as Missed", () => {
    expect(periodState(2_000, 0, "2026-01-01", "2026-01-20")).toBe("Missed")
  })

  it("keeps a future unpaid period as Expected", () => {
    expect(periodState(2_000, 0, "2026-02-01", "2026-01-20")).toBe("Expected")
  })

  it("honours a grace period before declaring a miss", () => {
    expect(periodState(2_000, 0, "2026-01-18", "2026-01-20", 5)).toBe("Expected")
  })
})

describe("period keys", () => {
  it("produces ISO week keys", () => {
    expect(weekKey(new Date(2026, 9, 4))).toMatch(/^2026-W\d{2}$/)
  })

  it("keys monthly and daily periods", () => {
    expect(periodKeyFor(new Date(2026, 9, 4), "Monthly")).toBe("2026-10")
    expect(periodKeyFor(new Date(2026, 9, 4), "Daily")).toBe("2026-10-04")
  })
})

describe("contribution balance", () => {
  it("totals completed credits and subtracts completed withdrawals", () => {
    const transactions = [
      credit({ id: "tx-1", amount: 2_000 }),
      credit({ id: "tx-2", amount: 3_000 }),
      credit({ id: "tx-3", amount: 9_000, status: "Pending" }),
      credit({ id: "tx-4", amount: 5_000, type: "Withdrawal", direction: "debit" }),
    ]
    const withdrawals: ContributionWithdrawal[] = [
      {
        id: "w-1", organizationId, reference: "WDR-1", contributionId: "cont-1", kind: "Partial",
        grossAmount: 4_000, commission: 200, fees: 100, netPayout: 3_700, status: "Completed",
        destination: "Org account", requestedBy: "Ada Obi", requestedById: "admin-ada", requestedAt: "2026-01-05",
      },
      {
        id: "w-2", organizationId, reference: "WDR-2", contributionId: "cont-1", kind: "Partial",
        grossAmount: 1_000, commission: 50, fees: 0, netPayout: 950, status: "Pending approval",
        destination: "Org account", requestedBy: "Ada Obi", requestedById: "admin-ada", requestedAt: "2026-01-06",
      },
    ]

    const balance = contributionBalance(contribution(), transactions, withdrawals)
    expect(balance.totalContributed).toBe(5_000)
    expect(balance.pendingAmount).toBe(9_000)
    expect(balance.totalWithdrawn).toBe(4_000)
    expect(balance.availableBalance).toBe(1_000)
    expect(balance.commissionAccrued).toBe(200)
  })

  it("reports the remaining amount towards a target", () => {
    const balance = contributionBalance(
      contribution({ type: "Target", targetAmount: 10_000, fixedAmount: undefined }),
      [credit({ amount: 4_000 })],
      [],
    )
    expect(balance.targetAmount).toBe(10_000)
    expect(balance.amountRemaining).toBe(6_000)
  })

  it("leaves the remaining amount undefined when there is no target", () => {
    expect(contributionBalance(contribution(), [credit()], []).amountRemaining).toBeUndefined()
  })

  it("never reports a negative available balance", () => {
    const withdrawals: ContributionWithdrawal[] = [{
      id: "w-1", organizationId, reference: "WDR-1", contributionId: "cont-1", kind: "Full",
      grossAmount: 99_000, commission: 0, fees: 0, netPayout: 99_000, status: "Completed",
      destination: "Org", requestedBy: "Ada", requestedById: "admin-ada", requestedAt: "2026-01-05",
    }]
    expect(contributionBalance(contribution(), [credit()], withdrawals).availableBalance).toBe(0)
  })
})

describe("period generation", () => {
  it("generates one period per day across the requested window", () => {
    const periods = generatePeriods(contribution(), [participant()], [credit({ date: "2026-01-01" })], "2026-01-05", {
      from: "2026-01-01",
      to: "2026-01-05",
    })
    expect(periods).toHaveLength(5)
    expect(periods[0].periodKey).toBe("2026-01-01")
    expect(periods[0].state).toBe("Paid")
    // 4 Jan is overdue; 5 Jan is due today and is not yet a miss.
    expect(periods[3].state).toBe("Missed")
    expect(periods[4].state).toBe("Expected")
  })

  it("generates monthly periods for a monthly contribution", () => {
    const monthly = contribution({ frequency: "Monthly", startDate: "2026-01-01" })
    const periods = generatePeriods(monthly, [participant()], [], "2026-04-01", { from: "2026-01-01", to: "2026-03-31" })
    expect(periods.map((p) => p.periodKey)).toEqual(["2026-01", "2026-02", "2026-03"])
  })

  it("steps by the custom interval", () => {
    const custom = contribution({ frequency: "Custom", customFrequency: { label: "Every 10 days", days: 10 }, startDate: "2026-01-01" })
    const periods = generatePeriods(custom, [participant()], [], "2026-02-01", { from: "2026-01-01", to: "2026-01-31" })
    expect(periods.map((p) => p.dueDate)).toEqual(["2026-01-01", "2026-01-11", "2026-01-21", "2026-01-31"])
  })

  it("produces no schedule when the contribution has no frequency", () => {
    const open = contribution({ frequencyBased: false, frequency: "None" })
    expect(generatePeriods(open, [participant()], [], "2026-01-05")).toEqual([])
  })

  it("stops at the end date when one is set", () => {
    const fixedTerm = contribution({ endDate: "2026-01-03" })
    const periods = generatePeriods(fixedTerm, [participant()], [], "2026-01-10", { from: "2026-01-01", to: "2026-01-31" })
    expect(periods.map((p) => p.dueDate)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"])
  })
})

describe("collection aggregation", () => {
  it("groups completed credits by month", () => {
    const buckets = aggregateByPeriod(
      [credit({ id: "a", date: "2026-01-04", amount: 1_000 }), credit({ id: "b", date: "2026-01-20", amount: 500 }), credit({ id: "c", date: "2026-02-01", amount: 2_000 })],
      "monthly",
    )
    expect(buckets).toEqual([
      { key: "2026-01", collected: 1_500, movements: 2 },
      { key: "2026-02", collected: 2_000, movements: 1 },
    ])
  })

  it("ignores pending and debit movements", () => {
    const buckets = aggregateByPeriod(
      [credit({ id: "a", status: "Pending" }), credit({ id: "b", direction: "debit", type: "Withdrawal" })],
      "daily",
    )
    expect(buckets).toEqual([])
  })
})
