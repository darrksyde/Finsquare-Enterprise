import type {
  Borrower,
  Loan,
  LoanEligibilityResult,
  LoanProduct,
  LoanStatus,
  LoanSummary,
  LoanTerms,
  RepaymentFrequency,
  RepaymentScheduleItem,
  ScheduleStatus,
} from "../types/loan.types"

const DAY = 86_400_000
const round = (n: number) => Math.round(n * 100) / 100

export const todayISO = () => toISO(new Date())
export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
export const parseISO = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (iso: string, days: number) =>
  toISO(new Date(parseISO(iso).getTime() + days * DAY + 3_600_000))
export const addMonths = (iso: string, months: number) => {
  const d = parseISO(iso)
  d.setMonth(d.getMonth() + months)
  return toISO(d)
}
export const daysBetween = (from: string, to: string) =>
  Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / DAY)
export const offsetDays = (days: number) => addDays(todayISO(), days)

export const frequencyDays: Record<RepaymentFrequency, number> = {
  Daily: 1,
  Weekly: 7,
  Biweekly: 14,
  Monthly: 30,
}

export function durationDays(terms: Pick<LoanTerms, "duration" | "durationUnit">) {
  const unit = { Days: 1, Weeks: 7, Months: 30 }[terms.durationUnit]
  return terms.duration * unit
}

export function installmentCount(terms: LoanTerms) {
  return Math.max(1, Math.round(durationDays(terms) / frequencyDays[terms.frequency]))
}

const dueDateFor = (first: string, i: number, f: RepaymentFrequency) =>
  f === "Monthly" ? addMonths(first, i) : addDays(first, i * frequencyDays[f])

export function scheduleStatus(
  item: Pick<RepaymentScheduleItem, "dueDate" | "amount" | "paid">,
  today = todayISO(),
): ScheduleStatus {
  if (item.paid >= item.amount - 0.005) return "Paid"
  if (item.dueDate < today) return item.paid > 0 ? "Partially Paid" : "Overdue"
  if (item.dueDate === today) return item.paid > 0 ? "Partially Paid" : "Due"
  return item.paid > 0 ? "Partially Paid" : "Upcoming"
}

export function calculateLoan(terms: LoanTerms, startDate = todayISO()): LoanSummary {
  const principal = terms.amount
  const n = installmentCount(terms)
  const fDays = frequencyDays[terms.frequency]
  const ratePerPeriod =
    terms.frequency === "Monthly"
      ? terms.interestRate / 100 / 12
      : (terms.interestRate / 100) * (fDays / 365)
  const zero = terms.interestType === "Zero interest" || terms.interestRate === 0
  const upfrontInterest = terms.deductionModel === "Interest & fees at disbursement"

  const rows: { principal: number; interest: number }[] = []
  if (zero) {
    for (let i = 0; i < n; i++) rows.push({ principal: principal / n, interest: 0 })
  } else if (terms.interestType === "Flat") {
    const totalInterest = principal * (terms.interestRate / 100) * (durationDays(terms) / 365)
    for (let i = 0; i < n; i++)
      rows.push({ principal: principal / n, interest: totalInterest / n })
  } else {
    const pmt =
      (principal * ratePerPeriod) / (1 - Math.pow(1 + ratePerPeriod, -n))
    let bal = principal
    for (let i = 0; i < n; i++) {
      const interest = bal * ratePerPeriod
      const p = i === n - 1 ? bal : pmt - interest
      rows.push({ principal: p, interest })
      bal -= p
    }
  }

  const interest = round(rows.reduce((s, r) => s + r.interest, 0))
  const fees = round((principal * terms.applicationFeePct) / 100)
  const deduction =
    terms.deductionModel === "None"
      ? 0
      : terms.deductionModel === "Fees at disbursement"
        ? fees
        : round(fees + interest)

  const first =
    terms.firstRepaymentDate ||
    (terms.frequency === "Monthly"
      ? addMonths(addDays(startDate, terms.graceDays), 1)
      : addDays(startDate, terms.graceDays + fDays))

  let balance = principal
  const schedule: RepaymentScheduleItem[] = rows.map((r, i) => {
    const p = round(r.principal)
    const int = upfrontInterest ? 0 : round(r.interest)
    balance = round(balance - p)
    const dueDate = dueDateFor(first, i, terms.frequency)
    const item = {
      no: i + 1,
      dueDate,
      amount: round(p + int),
      principal: p,
      interest: int,
      paid: 0,
      balance: Math.max(0, balance),
      status: "Upcoming" as ScheduleStatus,
    }
    return item
  })
  // absorb rounding drift into the last installment
  const last = schedule[schedule.length - 1]
  const drift = round(principal - schedule.reduce((s, r) => s + r.principal, 0))
  if (drift) {
    last.principal = round(last.principal + drift)
    last.amount = round(last.amount + drift)
    last.balance = 0
  }
  schedule.forEach((s) => (s.status = scheduleStatus(s)))

  const totalRepayable = round(schedule.reduce((s, r) => s + r.amount, 0))
  return {
    principal,
    interest,
    fees,
    deduction,
    netDisbursed: round(principal - deduction),
    installment: schedule[0]?.amount ?? 0,
    totalRepayable,
    count: n,
    startDate: first,
    endDate: last.dueDate,
    schedule,
  }
}

export function deriveLoanState(
  loan: Loan,
  defaultAfterDays: number,
  today = todayISO(),
): Loan {
  const schedule = loan.schedule.map((s) => ({ ...s, status: scheduleStatus(s, today) }))
  const paid = round(schedule.reduce((s, r) => s + r.paid, 0))
  const outstanding = round(Math.max(0, loan.totalRepayable - paid))
  const late = schedule.filter((s) => s.status === "Overdue" || (s.status === "Partially Paid" && s.dueDate < today))
  const overdueAmount = round(late.reduce((s, r) => s + (r.amount - r.paid), 0))
  const daysOverdue = late.length ? daysBetween(late[0].dueDate, today) : 0
  const next = schedule.find((s) => s.status !== "Paid" && s.dueDate >= today)
  let status: LoanStatus
  if (loan.writtenOff) status = "Written Off"
  else if (outstanding <= 0.005) status = "Completed"
  else if (loan.defaulted || daysOverdue >= defaultAfterDays) status = "Defaulted"
  else if (daysOverdue > 0) status = "Overdue"
  else status = paid > 0 ? "Current" : "Active"
  return {
    ...loan,
    schedule,
    status,
    paid,
    outstanding: status === "Completed" ? 0 : outstanding,
    overdueAmount,
    daysOverdue,
    nextDueDate: next?.dueDate,
    nextDueAmount: next ? round(next.amount - next.paid) : 0,
  }
}

export function allocateRepayment(
  schedule: RepaymentScheduleItem[],
  amount: number,
): { schedule: RepaymentScheduleItem[]; allocation: { no: number; amount: number }[]; unallocated: number } {
  let left = amount
  const allocation: { no: number; amount: number }[] = []
  const next = schedule.map((s) => {
    if (left <= 0.005 || s.paid >= s.amount) return s
    const take = round(Math.min(left, s.amount - s.paid))
    left = round(left - take)
    allocation.push({ no: s.no, amount: take })
    return { ...s, paid: round(s.paid + take) }
  })
  return { schedule: next, allocation, unallocated: left }
}

export function checkEligibility(
  product: LoanProduct,
  borrower: Borrower,
  amount: number,
  activeLoans: number,
  hasOverdue: boolean,
): LoanEligibilityResult {
  const e = product.eligibility
  const checks: LoanEligibilityResult["checks"] = [
    {
      rule: "Amount within product limits",
      expected: `${product.minAmount.toLocaleString()} – ${product.maxAmount.toLocaleString()}`,
      actual: amount.toLocaleString(),
      result: amount >= product.minAmount && amount <= product.maxAmount ? "pass" : "fail",
    },
    {
      rule: "Relationship duration",
      expected: `≥ ${e.minMembershipMonths} months`,
      actual: `${borrower.membershipMonths} months`,
      result: borrower.membershipMonths >= e.minMembershipMonths ? "pass" : "fail",
    },
    {
      rule: "Savings balance",
      expected: `≥ ${e.minSavingsBalance.toLocaleString()}`,
      actual: borrower.savingsBalance.toLocaleString(),
      result: borrower.savingsBalance >= e.minSavingsBalance ? "pass" : borrower.type === "External" ? "review" : "fail",
    },
    {
      rule: "Active loans limit",
      expected: `< ${product.maxActiveLoans}`,
      actual: String(activeLoans),
      result: activeLoans < product.maxActiveLoans ? "pass" : "fail",
    },
  ]
  if (e.blockIfOverdueLoan)
    checks.push({
      rule: "No overdue loans",
      expected: "None overdue",
      actual: hasOverdue ? "Has overdue loan" : "None overdue",
      result: hasOverdue ? "fail" : "pass",
    })
  if (e.requireKyc)
    checks.push({
      rule: "Identity (KYC) verified",
      expected: "Verified",
      actual: borrower.kycVerified ? "Verified" : "Not verified",
      result: borrower.kycVerified ? "pass" : "review",
    })
  const outcome = checks.some((c) => c.result === "fail")
    ? "Not Eligible"
    : checks.some((c) => c.result === "review")
      ? "Needs Review"
      : "Eligible"
  return { outcome, checks }
}
