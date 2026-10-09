import { describe, expect, it } from "vitest"
import {
  contributionObligations,
  loanObligations,
  memberMoneySummary,
  memberObligations,
} from "./member-obligations"
import type {
  Contribution,
  ContributionParticipant,
  ContributionPeriod,
} from "@/features/contributions/types/contribution.types"
import type { Loan, RepaymentScheduleItem } from "@/features/loans/types/loan.types"

const MEMBER = "LFC-002481"
const OTHER = "LFC-002479"
const TODAY = "2026-03-15"

function contribution(overrides: Partial<Contribution> = {}): Contribution {
  return {
    id: "cont-ajo",
    organizationId: "org-test",
    name: "Ikeja Daily Ajo",
    type: "Fixed",
    form: "Personal",
    frequencyBased: true,
    frequency: "Monthly",
    participantScope: "All",
    status: "Active",
    fixedAmount: 2_000,
    paymentMethods: [],
    recipient: { kind: "organization", label: "Association account" },
    createdBy: "Kemi Adebayo",
    createdAt: TODAY,
    updatedAt: TODAY,
    ...overrides,
  } as Contribution
}

function participant(overrides: Partial<ContributionParticipant> = {}): ContributionParticipant {
  return {
    id: "cont-ajo:LFC-002481",
    organizationId: "org-test",
    contributionId: "cont-ajo",
    memberId: MEMBER,
    memberName: "Adewale Johnson",
    isExternal: false,
    contact: {},
    expectedAmount: 2_000,
    totalContributed: 6_000,
    availableBalance: 6_000,
    missedCount: 1,
    lateCount: 0,
    state: "Behind",
    ...overrides,
  } as ContributionParticipant
}

function period(overrides: Partial<ContributionPeriod> = {}): ContributionPeriod {
  return {
    id: "cont-ajo:LFC-002481:2026-03",
    organizationId: "org-test",
    contributionId: "cont-ajo",
    participantId: "cont-ajo:LFC-002481",
    periodKey: "2026-03",
    dueDate: "2026-03-01",
    expectedAmount: 2_000,
    paidAmount: 0,
    state: "Missed",
    ...overrides,
  } as ContributionPeriod
}

function installment(overrides: Partial<RepaymentScheduleItem> = {}): RepaymentScheduleItem {
  return {
    no: 1,
    dueDate: "2026-03-01",
    amount: 100_000,
    principal: 90_000,
    interest: 10_000,
    paid: 0,
    balance: 100_000,
    status: "Overdue",
    ...overrides,
  }
}

function borrower(overrides: Partial<Loan["borrower"]> = {}): Loan["borrower"] {
  return {
    id: "b-1",
    name: "Adewale Johnson",
    phone: "+234 803 214 7780",
    type: "Member",
    memberId: MEMBER,
    branch: "Ikeja",
    address: "Ikeja, Lagos",
    occupation: "Poultry farmer",
    membershipMonths: 24,
    savingsBalance: 180_000,
    kycVerified: true,
    ...overrides,
  }
}

function loan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: "loan-1",
    reference: "LN-5001",
    borrower: borrower(),
    productId: "lp-business",
    productName: "Business Loan",
    terms: { amount: 200_000, duration: 2, interestType: "Flat", interestRate: 10, applicationFeePct: 1, frequency: "Monthly" },
    principal: 200_000,
    interest: 20_000,
    fees: 2_000,
    deduction: 0,
    netDisbursed: 200_000,
    totalRepayable: 220_000,
    installment: 110_000,
    disbursedAt: "2026-01-01",
    endDate: "2026-04-01",
    schedule: [installment(), installment({ no: 2, dueDate: "2026-04-01", status: "Upcoming" })],
    virtualAccount: { accountNumber: "98000001", accountName: "FINSQ", bank: "9PSB", reference: "RPY", status: "Active" },
    officer: "Kemi Adebayo",
    documents: [],
    activity: [],
    status: "Overdue",
    paid: 0,
    outstanding: 220_000,
    overdueAmount: 100_000,
    daysOverdue: 14,
    nextDueDate: "2026-04-01",
    nextDueAmount: 110_000,
    ...overrides,
  } as Loan
}

const ctx = {
  memberId: MEMBER,
  contributions: [contribution()],
  participants: [participant()],
  periods: [period()],
  today: TODAY,
}

describe("contribution obligations", () => {
  it("counts a due period that is not fully paid", () => {
    const items = contributionObligations(ctx)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      kind: "Contribution",
      title: "Ikeja Daily Ajo",
      outstanding: 2_000,
      overdue: true,
      contributionId: "cont-ajo",
      periodKey: "2026-03",
    })
  })

  it("settles the outstanding amount of a partially paid period", () => {
    const items = contributionObligations({
      ...ctx,
      periods: [period({ paidAmount: 500, state: "Late" })],
    })
    expect(items[0].outstanding).toBe(1_500)
    expect(items[0].overdue).toBe(true)
  })

  it("ignores a period that is not due yet", () => {
    const items = contributionObligations({
      ...ctx,
      periods: [period({ dueDate: "2026-04-01", state: "Expected" })],
    })
    expect(items).toHaveLength(0)
  })

  it("ignores a fully paid period and an overpayment", () => {
    expect(contributionObligations({ ...ctx, periods: [period({ paidAmount: 2_000, state: "Paid" })] })).toHaveLength(0)
    expect(contributionObligations({ ...ctx, periods: [period({ paidAmount: 2_500, state: "Paid" })] })).toHaveLength(0)
  })

  it("ignores another member's participant record", () => {
    const items = contributionObligations({
      ...ctx,
      participants: [participant({ id: "cont-ajo:LFC-002479", memberId: OTHER })],
    })
    expect(items).toHaveLength(0)
  })

  it("surfaces one obligation per settleable key, even when two periods share it", () => {
    // A monthly plan can emit two due dates inside one month; a payment settles by key, so the
    // second row could never be cleared and must not be offered.
    const items = contributionObligations({
      ...ctx,
      periods: [
        period({ id: "same-key-later", dueDate: "2026-03-31", periodKey: "2026-03" }),
        period({ id: "same-key-earlier", dueDate: "2026-03-01", periodKey: "2026-03" }),
      ],
    })
    expect(items).toHaveLength(1)
    expect(items[0].dueDate).toBe("2026-03-01")
    expect(items[0].id).toBe("contribution:cont-ajo:LFC-002481:2026-03")
  })

  it("keeps separate obligations for separate keys", () => {
    const items = contributionObligations({
      ...ctx,
      periods: [
        period({ periodKey: "2026-02", dueDate: "2026-02-01" }),
        period({ periodKey: "2026-03", dueDate: "2026-03-01" }),
      ],
    })
    expect(items).toHaveLength(2)
    expect(new Set(items.map((item) => item.id)).size).toBe(2)
  })
})

describe("loan obligations", () => {
  it("counts a due instalment and skips an upcoming one", () => {
    const items = loanObligations({ memberId: MEMBER, loans: [loan()], today: TODAY })
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      kind: "Loan repayment",
      title: "Business Loan",
      outstanding: 100_000,
      overdue: true,
      loanId: "loan-1",
    })
    expect(items[0].detail).toContain("Instalment 1 of 2")
  })

  it("skips a borrower who is not this member", () => {
    const items = loanObligations({
      memberId: MEMBER,
      loans: [loan({ borrower: borrower({ id: "b-2", name: "Someone", memberId: OTHER }) })],
      today: TODAY,
    })
    expect(items).toHaveLength(0)
  })

  it("charges the instalment's own shortfall, not the loan's running balance", () => {
    // `balance` on the schedule is what is left of the whole loan after this instalment.
    const items = loanObligations({
      memberId: MEMBER,
      loans: [
        loan({
          schedule: [
            installment({ no: 1, amount: 50_000, paid: 10_000, balance: 900_000 }),
            installment({ no: 2, amount: 50_000, paid: 0, balance: 850_000 }),
          ],
        }),
      ],
      today: TODAY,
    })
    expect(items.map((item) => item.outstanding)).toEqual([40_000, 50_000])
    expect(items.reduce((sum, item) => sum + item.outstanding, 0)).toBe(90_000)
  })

  it("ignores an instalment with nothing left on it", () => {
    const items = loanObligations({
      memberId: MEMBER,
      loans: [loan({ schedule: [installment({ amount: 50_000, paid: 50_000, balance: 950_000 })] })],
      today: TODAY,
    })
    expect(items).toHaveLength(0)
  })
})

describe("member obligations", () => {
  it("merges both modules and orders them oldest first", () => {
    const result = memberObligations({
      ...ctx,
      periods: [period({ dueDate: "2026-03-10", paidAmount: 0, state: "Missed" })],
      loans: [loan({ schedule: [installment({ dueDate: "2026-03-01" })] })],
    })
    expect(result.items.map((item) => item.kind)).toEqual(["Loan repayment", "Contribution"])
    expect(result.totalDue).toBe(102_000)
    expect(result.overdueCount).toBe(2)
  })
  it("reports nothing owing for a member who owes nothing", () => {
    const result = memberObligations({ ...ctx, participants: [participant({ memberId: OTHER, id: "cont-ajo:LFC-002479" })], loans: [] })
    expect(result.items).toHaveLength(0)
    expect(result.totalDue).toBe(0)
  })
})

describe("member money summary", () => {
  it("totals contributions, missed periods and loan exposure", () => {
    const summary = memberMoneySummary({
      memberId: MEMBER,
      participants: [participant(), participant({ id: "cont-ajo:LFC-002479", memberId: OTHER, totalContributed: 9_999, availableBalance: 9_999 })],
      periods: [period(), period({ id: "p2", periodKey: "2026-02", dueDate: "2026-02-01", state: "Paid" })],
      loans: [loan()],
      walletBalance: 32_000,
      today: TODAY,
    })
    expect(summary).toMatchObject({
      contributionsPaid: 6_000,
      contributionBalance: 6_000,
      contributionsExpected: 4_000,
      missedContributions: 1,
      loansOutstanding: 220_000,
      activeLoans: 1,
      nextLoanDueDate: "2026-04-01",
      walletBalance: 32_000,
    })
  })

  it("excludes a completed loan from the member's exposure", () => {
    const summary = memberMoneySummary({
      memberId: MEMBER,
      participants: [participant()],
      periods: [],
      loans: [loan({ status: "Completed" })],
      walletBalance: 0,
      today: TODAY,
    })
    expect(summary.activeLoans).toBe(0)
    expect(summary.loansOutstanding).toBe(0)
  })
})
