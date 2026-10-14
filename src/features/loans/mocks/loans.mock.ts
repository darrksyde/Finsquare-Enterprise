import { createFormsMock, createResponsesMock } from "./forms.mock"
import {
  addDays,
  calculateLoan,
  checkEligibility,
  offsetDays,
  deriveLoanState,
} from "../domain/calculations"
import type {
  Borrower,
  Guarantor,
  GuarantorRequest,
  Loan,
  LoanActivity,
  LoanApplication,
  LoanApplicationForm,
  LoanDataset,
  LoanDocument,
  LoanProduct,
  LoanRepayment,
  LoanTerms,
  RecoveryCase,
  RepaymentMethod,
  Disbursement,
  ApplicationStatus,
} from "../types/loan.types"

let seq = 100
const uid = (p: string) => `${p}-${++seq}`

const product = (p: Partial<LoanProduct> & Pick<LoanProduct, "id" | "name">): LoanProduct => ({
  description: "",
  minAmount: 50_000,
  maxAmount: 1_000_000,
  minDuration: 3,
  maxDuration: 12,
  durationUnit: "Months",
  interestType: "Reducing balance",
  interestRate: 24,
  applicationFeePct: 1,
  deductionModel: "Fees at disbursement",
  frequency: "Monthly",
  maxActiveLoans: 1,
  graceDays: 0,
  requiresApproval: true,
  requiresGuarantor: false,
  guarantorsRequired: 0,
  applicationType: "Internal",
  allowExternalGuarantors: true,
  requireGuarantorVerification: true,
  requireGuarantorDocuments: false,
  eligibility: { minMembershipMonths: 3, minSavingsBalance: 10_000, blockIfOverdueLoan: true, requireKyc: true },
  status: "Active",
  updatedAt: offsetDays(-30),
  ...p,
})

export const productsMock: LoanProduct[] = [
  product({ id: "lp-business", name: "Business Loan", description: "Working capital and equipment finance for traders and agribusinesses.", minAmount: 100_000, maxAmount: 5_000_000, minDuration: 6, maxDuration: 24, interestRate: 28, applicationFeePct: 1.5, maxActiveLoans: 1, requiresGuarantor: true, guarantorsRequired: 2, applicationType: "Both", requireGuarantorDocuments: true, eligibility: { minMembershipMonths: 6, minSavingsBalance: 50_000, blockIfOverdueLoan: true, requireKyc: true } }),
  product({ id: "lp-education", name: "Education Loan", description: "School fees and training costs, repaid across the term.", minAmount: 50_000, maxAmount: 1_500_000, minDuration: 3, maxDuration: 12, interestType: "Flat", interestRate: 15, applicationFeePct: 1, requiresGuarantor: true, guarantorsRequired: 1, applicationType: "Both" }),
  product({ id: "lp-emergency", name: "Emergency Loan", description: "Fast, small-ticket loan for urgent needs. Weekly repayments.", minAmount: 10_000, maxAmount: 150_000, minDuration: 4, maxDuration: 12, durationUnit: "Weeks", interestType: "Flat", interestRate: 12, applicationFeePct: 0.5, frequency: "Weekly", maxActiveLoans: 1, requiresApproval: false, eligibility: { minMembershipMonths: 1, minSavingsBalance: 5_000, blockIfOverdueLoan: true, requireKyc: false } }),
  product({ id: "lp-salary", name: "Salary Loan", description: "Salary-backed advance repaid via direct debit.", minAmount: 30_000, maxAmount: 800_000, minDuration: 1, maxDuration: 6, interestType: "Flat", interestRate: 18, applicationFeePct: 1, deductionModel: "Interest & fees at disbursement", maxActiveLoans: 2 }),
  product({ id: "lp-personal", name: "Personal Loan", description: "General purpose personal financing.", minAmount: 20_000, maxAmount: 600_000, minDuration: 3, maxDuration: 12, interestRate: 26, graceDays: 7, maxActiveLoans: 2 }),
  product({ id: "lp-solidarity", name: "Solidarity Loan", description: "Zero-interest welfare loan for members in good standing.", minAmount: 10_000, maxAmount: 100_000, minDuration: 2, maxDuration: 6, interestType: "Zero interest", interestRate: 0, applicationFeePct: 0, deductionModel: "None", status: "Inactive" }),
]
const P = (id: string) => productsMock.find((p) => p.id === id)!

const b = (id: string, name: string, phone: string, o: Partial<Borrower> = {}): Borrower => ({
  id, name, phone, type: "Member", memberId: `LFC-00${2400 + Number(id.slice(2))}`, branch: "Ikeja", address: "Ikeja, Lagos", occupation: "Trader",
  membershipMonths: 24, savingsBalance: 180_000, kycVerified: true, email: `${name.split(" ")[0].toLowerCase()}@example.com`, ...o,
})
export const borrowersMock: Borrower[] = [
  // Borrowers who also exist in the member registry (`features/members/mocks/members.mock.ts`)
  // carry that registry's id, so a member's loans resolve from their own profile. Borrowers who
  // are not in it keep a generated id.
  b("b-1", "Adewale Johnson", "+234 803 214 7780", { memberId: "LFC-002481", occupation: "Poultry farmer" }),
  b("b-2", "Chinedu Okafor", "+234 806 412 0951", { memberId: "LFC-002479", branch: "Surulere", occupation: "Rice farmer", savingsBalance: 320_000 }),
  b("b-3", "Fatima Bello", "+234 702 831 2044", { memberId: "LFC-002462", branch: "Ikorodu", occupation: "Tailor", membershipMonths: 40 }),
  b("b-4", "Ngozi Eze", "+234 810 556 9023", { occupation: "Teacher", savingsBalance: 95_000 }),
  b("b-5", "Tunde Bakare", "+234 805 117 3390", { branch: "Surulere", occupation: "Transporter", savingsBalance: 22_000, membershipMonths: 5 }),
  b("b-6", "Amina Yusuf", "+234 809 604 7712", { type: "External", memberId: undefined, branch: "Walk-in", occupation: "Market trader", membershipMonths: 0, savingsBalance: 0, kycVerified: false }),
  b("b-7", "Samuel Adeyemi", "+234 901 223 4468", { occupation: "Welder", branch: "Ikorodu" }),
  b("b-8", "Grace Obi", "+234 813 790 5521", { occupation: "Caterer", savingsBalance: 410_000 }),
  b("b-9", "Ibrahim Musa", "+234 807 338 1145", { type: "External", memberId: undefined, branch: "Walk-in", occupation: "Farmer", membershipMonths: 0, savingsBalance: 0 }),
]
const B = (id: string) => borrowersMock.find((x) => x.id === id)!

const guarantors: Guarantor[] = [
  { id: "g-1", name: "Emeka Nwosu", phone: "+234 802 100 4411", relationship: "Business partner", type: "Member", memberId: "LFC-001988", occupation: "Importer" },
  { id: "g-2", name: "Halima Sani", phone: "+234 703 998 2210", relationship: "Sister", type: "External", occupation: "Civil servant" },
  { id: "g-3", name: "Peter Alade", phone: "+234 816 452 0087", relationship: "Employer", type: "External", occupation: "Company director" },
  { id: "g-4", name: "Bisi Ogunleye", phone: "+234 805 771 3302", relationship: "Friend", type: "Member", memberId: "LFC-002104", occupation: "Pharmacist" },
  { id: "g-5", name: "Musa Danjuma", phone: "+234 908 245 6619", relationship: "Uncle", type: "External", occupation: "Retired" },
]

const doc = (name: string, type: string, review: LoanDocument["review"] = "Accepted", ago = 10): LoanDocument => ({ id: uid("doc"), name, type, uploadedAt: offsetDays(-ago), review })
const act = (action: string, ago: number, actor = "System", detail?: string): LoanActivity => ({ id: uid("act"), at: offsetDays(-ago), actor, action, detail })

const terms = (pid: string, amount: number, duration: number): LoanTerms => {
  const p = P(pid)
  return { amount, duration, durationUnit: p.durationUnit, interestType: p.interestType, interestRate: p.interestRate, applicationFeePct: p.applicationFeePct, deductionModel: p.deductionModel, frequency: p.frequency, graceDays: p.graceDays }
}
const officers = ["Kemi Adebayo", "Tobi Lawal", "Ruth Okonkwo"]

const application = (n: number, bid: string, pid: string, amount: number, duration: number, status: ApplicationStatus, ago: number, extra: Partial<LoanApplication> = {}): LoanApplication => {
  const borrower = B(bid)
  return {
    id: `app-${n}`, reference: `LA-${2600 + n}`, applicant: borrower, productId: pid, productName: P(pid).name,
    terms: terms(pid, amount, duration), purpose: "Business expansion", source: borrower.type === "External" ? "Public link" : "Internal", status,
    officer: officers[n % 3], submittedAt: offsetDays(-ago), employment: borrower.occupation, monthlyIncome: 150_000 + n * 20_000,
    documents: [doc("National ID", "Identity", "Accepted", ago), doc("Proof of address", "Address", status === "Submitted" ? "Pending review" : "Accepted", ago), doc("Bank statement (3 months)", "Financial", "Pending review", ago)],
    eligibility: checkEligibility(P(pid), borrower, amount, 0, false),
    activity: [act("Application submitted", ago, borrower.name)],
    ...extra,
  }
}

const gr = (id: string, gi: number, applicationId: string | undefined, loanId: string | undefined, amount: number, status: GuarantorRequest["status"], notes = "", method?: GuarantorRequest["verificationMethod"]): GuarantorRequest => ({
  id, guarantor: guarantors[gi], applicationId, loanId, amount, status, notes, verificationMethod: method, updatedAt: offsetDays(-3),
  documents: status === "Accepted" || status === "Verified" ? [doc(`Signed guarantee – ${guarantors[gi].name}`, "Guarantee form", "Accepted", 4)] : [],
})

const buildLoan = (n: number, bid: string, pid: string, amount: number, duration: number, daysAgo: number, paidCount: number, o: Partial<Loan> = {}, partial = 0): { loan: Loan; repayments: LoanRepayment[] } => {
  const borrower = B(bid)
  const t = terms(pid, amount, duration)
  const sum = calculateLoan(t, offsetDays(-daysAgo))
  const methods: RepaymentMethod[] = ["Bank transfer", "Wallet debit", "Cash", "Direct debit", "POS/manual"]
  const id = `loan-${n}`
  const schedule = sum.schedule.map((s, i) => ({ ...s, paid: i < paidCount ? s.amount : i === paidCount ? partial : 0 }))
  const repayments: LoanRepayment[] = schedule.filter((s) => s.paid > 0).map((s, i) => ({
    id: `rp-${n}-${i}`, loanId: id, loanReference: `LN-${5000 + n}`, borrowerName: borrower.name, amount: s.paid, method: methods[(n + i) % 5],
    date: s.dueDate > offsetDays(0) ? offsetDays(-1) : s.dueDate, reference: `RPY${n}${i}${7390 + i}`, status: "Confirmed", allocation: [{ no: s.no, amount: s.paid }], recordedBy: i % 2 ? "Auto-collect" : "Kemi Adebayo",
  }))
  const loan: Loan = {
    id, reference: `LN-${5000 + n}`, applicationId: `app-${n}`, borrower, productId: pid, productName: P(pid).name, terms: t,
    principal: sum.principal, interest: sum.interest, fees: sum.fees, deduction: sum.deduction, netDisbursed: sum.netDisbursed, totalRepayable: sum.totalRepayable,
    installment: sum.installment, disbursedAt: offsetDays(-daysAgo), endDate: sum.endDate, schedule,
    virtualAccount: { accountNumber: `98${String(10000000 + n * 7331).slice(0, 8)}`, accountName: `FINSQ/${borrower.name.toUpperCase()}`, bank: "9PSB", reference: `RPY-${5000 + n}`, status: "Active" },
    officer: officers[n % 3], documents: [doc("Signed loan agreement", "Agreement", "Accepted", daysAgo), doc("National ID", "Identity", "Accepted", daysAgo)],
    activity: [act("Application approved", daysAgo + 3, officers[n % 3]), act("Loan disbursed", daysAgo, "Kemi Adebayo", `Net ${sum.netDisbursed.toLocaleString()} sent`), ...repayments.map((r) => act("Repayment received", daysAgo - 1, "System", `${r.amount.toLocaleString()} via ${r.method}`))],
    status: "Active", paid: 0, outstanding: 0, overdueAmount: 0, daysOverdue: 0, nextDueAmount: 0,
    ...o,
  }
  return { loan, repayments }
}

export function createLoanDataset(): LoanDataset {
  const defs = [
    buildLoan(1, "b-1", "lp-business", 1_200_000, 12, 150, 5),
    buildLoan(2, "b-2", "lp-personal", 300_000, 6, 100, 3, {}, 20_000),
    buildLoan(3, "b-3", "lp-education", 450_000, 9, 200, 6),
    buildLoan(4, "b-4", "lp-salary", 200_000, 4, 140, 3),
    buildLoan(5, "b-7", "lp-emergency", 80_000, 8, 28, 2),
    buildLoan(6, "b-8", "lp-business", 2_500_000, 18, 20, 0),
    buildLoan(7, "b-5", "lp-personal", 150_000, 6, 130, 1),
    buildLoan(8, "b-3", "lp-emergency", 50_000, 6, 120, 1, {}, 0),
    buildLoan(9, "b-1", "lp-personal", 100_000, 4, 400, 4),
    buildLoan(10, "b-9", "lp-business", 600_000, 12, 330, 2, { defaulted: true }),
  ]
  const settings = { defaultAfterDays: 60, reminderAfterDays: 3 }
  const loans = defs.map((d) => deriveLoanState(d.loan, settings.defaultAfterDays))
  const repayments = defs.flatMap((d) => d.repayments).sort((a, c) => c.date.localeCompare(a.date))

  const applications: LoanApplication[] = [
    application(11, "b-6", "lp-business", 900_000, 12, "Submitted", 1, { purpose: "Stock for a market stall", source: "Public link" }),
    application(12, "b-4", "lp-education", 300_000, 6, "Under Review", 3, { purpose: "Child's school fees" }),
    application(13, "b-8", "lp-business", 1_800_000, 18, "Guarantor Pending", 6, { purpose: "Catering equipment" }),
    application(14, "b-2", "lp-personal", 250_000, 6, "Approved", 8, { approvedAmount: 250_000, purpose: "Home renovation" }),
    application(15, "b-7", "lp-education", 500_000, 9, "Offer Sent", 9, { approvedAmount: 400_000, revisedOffer: { amount: 400_000, duration: 9, note: "Reduced to 80% of requested amount based on income." }, purpose: "Vocational training" }),
    application(16, "b-5", "lp-business", 3_000_000, 24, "Rejected", 12, { rejectionReason: "Savings balance and relationship duration below product requirement.", purpose: "Fleet expansion" }),
    application(17, "b-9", "lp-business", 700_000, 12, "Offer Accepted", 7, { approvedAmount: 700_000, source: "Public link", purpose: "Fertilizer and seed" }),
    application(18, "b-1", "lp-emergency", 60_000, 6, "Draft", 0, { purpose: "Medical bill" }),
    application(19, "b-3", "lp-salary", 120_000, 3, "Submitted", 0, { purpose: "Rent top-up" }),
  ]
  applications.forEach((a) => {
    a.eligibility = checkEligibility(P(a.productId), a.applicant, a.terms.amount, a.id === "app-19" ? 1 : 0, false)
    if (["Approved", "Offer Sent", "Offer Accepted", "Rejected", "Guarantor Pending"].includes(a.status)) a.activity.push(act("Moved to review", 5, a.officer))
    if (a.status === "Rejected") a.activity.push(act("Application rejected", 11, a.officer, a.rejectionReason))
    if (a.status === "Approved") a.activity.push(act("Application approved", 6, a.officer))
    if (a.status === "Offer Sent") a.activity.push(act("Revised offer sent", 8, a.officer))
  })
  applications.push(...defs.map((d, i) => {
    const l = d.loan
    const a = application(i + 1, l.borrower.id, l.productId, l.principal, l.terms.duration, "Disbursed", Math.round((Date.now() - new Date(l.disbursedAt).getTime()) / 86_400_000) + 3, { approvedAmount: l.principal })
    a.id = l.applicationId!; a.reference = `LA-${2600 + i + 1}`
    return a
  }))

  const guarantorRequests: GuarantorRequest[] = [
    gr("gr-1", 0, "app-13", undefined, 900_000, "Accepted", "Confirmed by phone.", "Phone verification"),
    gr("gr-2", 1, "app-13", undefined, 900_000, "Pending"),
    gr("gr-3", 2, "app-12", undefined, 300_000, "Verified", "Signed form uploaded and checked.", "Signed guarantee form"),
    gr("gr-4", 3, "app-15", undefined, 400_000, "Accepted", "", "Phone verification"),
    gr("gr-5", 4, "app-17", undefined, 700_000, "Accepted", "Visited in person by officer.", "Other"),
    gr("gr-6", 1, "app-11", undefined, 450_000, "Pending"),
    gr("gr-7", 0, undefined, "loan-1", 600_000, "Accepted", "", "Signed guarantee form"),
    gr("gr-8", 2, undefined, "loan-1", 600_000, "Accepted", "", "Phone verification"),
    gr("gr-9", 4, undefined, "loan-10", 600_000, "Accepted", "", "Phone verification"),
    gr("gr-10", 3, undefined, "loan-7", 75_000, "Accepted", "", "Signed guarantee form"),
    gr("gr-11", 1, "app-16", undefined, 1_500_000, "Rejected", "Declined – insufficient income."),
  ]

  const disbursements: Disbursement[] = loans.map((l, i) => ({
    id: `dsb-${i + 1}`, applicationId: l.applicationId!, loanId: l.id, borrowerName: l.borrower.name, approvedAmount: l.principal, fees: l.fees, deductions: l.deduction,
    netAmount: l.netDisbursed, destination: l.borrower.type === "External" ? "Access Bank •••• 4471" : "Member wallet", method: (l.borrower.type === "External" ? "Bank transfer" : "Wallet credit") as Disbursement["method"], date: l.disbursedAt, reference: `DSB-${9100 + i}`,
  })).sort((a, c) => c.date.localeCompare(a.date))

  const recoveryCases: RecoveryCase[] = loans
    .filter((l) => l.daysOverdue > 0)
    .map((l, i) => ({
      id: `rc-${i + 1}`, loanId: l.id, status: l.status === "Defaulted" ? "Guarantor Contacted" : i % 2 ? "Reminder Sent" : "Open", assignedTo: officers[i % 3], openedAt: offsetDays(-l.daysOverdue),
      notes: [{ id: uid("n"), at: offsetDays(-Math.max(1, l.daysOverdue - 2)), type: "Reminder sent", text: "SMS reminder delivered for overdue installment.", by: "System" }],
    }))

  const forms = createFormsMock()

  return { products: productsMock.map((p) => ({ ...p })), applications, loans, repayments, guarantorRequests, disbursements, recoveryCases, forms, settings, borrowers: borrowersMock, guarantors, responses: createResponsesMock(applications, forms, guarantorRequests) }
}

/**
 * The same dataset with nothing recorded in it, for a community that is not the seeded one.
 *
 * The recovery settings are configuration rather than records, so a new community starts with the
 * defaults the seeded one uses instead of nothing at all.
 */
export function createEmptyLoanDataset(): LoanDataset {
  const settings = createLoanDataset().settings
  return {
    products: [],
    applications: [],
    loans: [],
    repayments: [],
    guarantorRequests: [],
    disbursements: [],
    recoveryCases: [],
    forms: [],
    responses: [],
    borrowers: [],
    guarantors: [],
    settings,
  }
}

export { addDays, uid as mockId }
