import { applyDraft, applyPublish } from "@/features/forms/domain/forms"
import { extractSubmission } from "../domain/loan-forms"
import type { FormResponseValue, FormVersion } from "../types/form.types"
import {
  allocateRepayment,
  calculateLoan,
  checkEligibility,
  deriveLoanState,
  todayISO,
} from "../domain/calculations"
import { mockId, createEmptyLoanDataset } from "../mocks/loans.mock"
import { createMockLoanRepository } from "../repositories/mock-loan.repository"
import { SEED_ORGANIZATION_ID, isSeedTenant } from "@/lib/tenancy/seed-tenant"
import type { LoanRepository } from "../repositories/loan.repository"
import type {
  ApplicationStatus,
  Borrower,
  Disbursement,
  DisbursementMethod,
  GuarantorRequest,
  GuarantorStatus,
  Loan,
  LoanActivity,
  LoanApplication,
  LoanApplicationForm,
  LoanDataset,
  LoanProduct,
  LoanRepayment,
  LoanTerms,
  RecoveryCase,
  RecoveryStatus,
  RepaymentMethod,
  RecoverySettings,
  Guarantor,
} from "../types/loan.types"

const ACTOR = "Admin User"
const act = (action: string, detail?: string, actor = ACTOR): LoanActivity => ({
  id: mockId("act"),
  at: todayISO(),
  actor,
  action,
  detail,
})

export interface NewApplicationInput {
  applicant: Borrower
  product: LoanProduct
  terms: LoanTerms
  purpose: string
  employment: string
  monthlyIncome: number
  source: LoanApplication["source"]
  status?: ApplicationStatus
  guarantors?: { guarantor: Guarantor; amount: number }[]
  documents?: string[]
  response?: { form: LoanApplicationForm; version: FormVersion; values: Record<string, FormResponseValue> }
}

export class LoansService {
  constructor(private repo: LoanRepository) {}

  load = () => this.repo.load()
  subscribe = (l: () => void) => this.repo.subscribe(l)

  private async app(id: string) {
    const a = (await this.repo.load()).applications.find((x) => x.id === id)
    if (!a) throw new Error("Application not found")
    return a
  }
  private async loan(id: string) {
    const d = await this.repo.load()
    const l = d.loans.find((x) => x.id === id)
    if (!l) throw new Error("Loan not found")
    return { loan: l, d }
  }
  private async saveApp(a: LoanApplication, status: ApplicationStatus, entry: LoanActivity, patch: Partial<LoanApplication> = {}) {
    await this.repo.saveApplication({ ...a, ...patch, status, activity: [...a.activity, entry] })
  }

  // Products
  async saveProduct(p: LoanProduct) {
    await this.repo.saveProduct({ ...p, updatedAt: todayISO() })
  }

  // Applications
  async createApplication(input: NewApplicationInput) {
    const d = await this.repo.load()
    const active = d.loans.filter((l) => l.borrower.id === input.applicant.id && !["Completed", "Written Off"].includes(l.status))
    const eligibility = checkEligibility(input.product, input.applicant, input.terms.amount, active.length, active.some((l) => l.daysOverdue > 0))
    const n = d.applications.length + 2600
    const id = mockId("app")
    const status = input.status ?? "Submitted"
    const app: LoanApplication = {
      id, reference: `LA-${n}`, applicant: input.applicant, productId: input.product.id, productName: input.product.name,
      terms: input.terms, purpose: input.purpose, source: input.source, status,
      approvedAmount: status === "Approved" ? input.terms.amount : undefined,
      officer: "Kemi Adebayo", submittedAt: todayISO(), employment: input.employment, monthlyIncome: input.monthlyIncome,
      documents: (input.documents ?? []).map((name) => ({ id: mockId("doc"), name, type: "Upload", uploadedAt: todayISO(), review: "Pending review" as const })),
      eligibility,
      activity: [act(input.source === "Admin created" ? "Loan created by administrator" : "Application submitted", undefined, input.source === "Admin created" ? ACTOR : input.applicant.name)],
    }
    await this.repo.saveApplication(app)
    for (const g of input.guarantors ?? [])
      await this.repo.saveGuarantorRequest({ id: mockId("gr"), applicationId: id, guarantor: g.guarantor, amount: g.amount, status: "Pending", notes: "", documents: [], updatedAt: todayISO() })
    if (input.response) {
      const { form, version, values } = input.response
      await this.repo.saveResponse({ id: mockId("resp"), applicationId: id, formId: form.id, versionId: version.id, versionNumber: version.version, applicantType: input.applicant.type === "Member" ? "Internal" : "External", submittedAt: todayISO(), values })
      await this.repo.saveForm({ ...(d.forms.find((f) => f.id === form.id) ?? form), submissions: (d.forms.find((f) => f.id === form.id)?.submissions ?? 0) + 1 })
    }
    return app
  }

  async startReview(id: string) {
    const a = await this.app(id)
    await this.saveApp(a, "Under Review", act("Review started"))
  }

  async approve(id: string, amount: number, note: string) {
    const a = await this.app(id)
    if (amount !== a.terms.amount) {
      await this.saveApp(a, "Offer Sent", act("Revised offer sent to applicant", `${amount.toLocaleString()} instead of ${a.terms.amount.toLocaleString()}`), {
        approvedAmount: amount,
        revisedOffer: { amount, duration: a.terms.duration, note },
      })
    } else {
      await this.saveApp(a, "Approved", act("Application approved", note), { approvedAmount: amount })
    }
  }

  async reviseOffer(id: string, amount: number, duration: number, note: string) {
    const a = await this.app(id)
    await this.saveApp(a, "Offer Sent", act("Revised offer sent to applicant", note), {
      approvedAmount: amount,
      revisedOffer: { amount, duration, note },
    })
  }

  async acceptOffer(id: string) {
    const a = await this.app(id)
    const o = a.revisedOffer
    await this.saveApp(a, "Offer Accepted", act("Applicant accepted the offer", undefined, a.applicant.name), {
      terms: o ? { ...a.terms, amount: o.amount, duration: o.duration } : a.terms,
    })
  }

  async reject(id: string, reason: string) {
    const a = await this.app(id)
    await this.saveApp(a, "Rejected", act("Application rejected", reason), { rejectionReason: reason })
  }

  async requestInfo(id: string, message: string) {
    const a = await this.app(id)
    await this.saveApp(a, "Under Review", act("Additional information requested", message), { infoRequest: message })
  }

  async cancel(id: string) {
    const a = await this.app(id)
    await this.saveApp(a, "Cancelled", act("Application cancelled"))
  }

  async reviewDocument(appId: string, docId: string, review: "Accepted" | "Rejected") {
    const a = await this.app(appId)
    await this.repo.saveApplication({
      ...a,
      documents: a.documents.map((d) => (d.id === docId ? { ...d, review } : d)),
      activity: [...a.activity, act(`Document ${review.toLowerCase()}`, a.documents.find((d) => d.id === docId)?.name)],
    })
  }

  // Guarantors
  async addGuarantor(applicationId: string, guarantor: Guarantor, amount: number) {
    await this.repo.saveGuarantorRequest({ id: mockId("gr"), applicationId, guarantor, amount, status: "Pending", notes: "", documents: [], updatedAt: todayISO() })
  }

  async updateGuarantor(req: GuarantorRequest, status: GuarantorStatus, method: GuarantorRequest["verificationMethod"], notes: string, signedForm: boolean) {
    await this.repo.saveGuarantorRequest({
      ...req, status, verificationMethod: method, notes, updatedAt: todayISO(),
      documents: signedForm && !req.documents.length
        ? [{ id: mockId("doc"), name: `Signed guarantee – ${req.guarantor.name}`, type: "Guarantee form", uploadedAt: todayISO(), review: "Accepted" }]
        : req.documents,
    })
    if (req.applicationId) {
      const d = await this.repo.load()
      const a = d.applications.find((x) => x.id === req.applicationId)
      if (a && status === "Accepted") {
        const all = d.guarantorRequests.filter((g) => g.applicationId === a.id).map((g) => (g.id === req.id ? status : g.status))
        if (a.status === "Guarantor Pending" && all.every((s) => s === "Accepted"))
          await this.saveApp(a, "Under Review", act("All guarantors accepted"))
      }
    }
  }

  // Disbursement
  async disburse(appIds: string[], method: DisbursementMethod): Promise<Loan[]> {
    const created: Loan[] = []
    const d = await this.repo.load()
    for (const id of appIds) {
      const a = d.applications.find((x) => x.id === id)
      if (!a || !["Approved", "Offer Accepted"].includes(a.status)) continue
      const t = { ...a.terms, amount: a.approvedAmount ?? a.terms.amount }
      const sum = calculateLoan(t, todayISO())
      const n = d.loans.length + created.length + 5001
      const loanId = mockId("loan")
      const loan = deriveLoanState({
        id: loanId, reference: `LN-${n}`, applicationId: a.id, borrower: a.applicant, productId: a.productId, productName: a.productName, terms: t,
        principal: sum.principal, interest: sum.interest, fees: sum.fees, deduction: sum.deduction, netDisbursed: sum.netDisbursed, totalRepayable: sum.totalRepayable,
        installment: sum.installment, disbursedAt: todayISO(), endDate: sum.endDate, schedule: sum.schedule,
        virtualAccount: { accountNumber: `98${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`, accountName: `FINSQ/${a.applicant.name.toUpperCase()}`, bank: "9PSB", reference: `RPY-${n}`, status: "Active" },
        officer: a.officer, documents: a.documents, activity: [act("Application approved", undefined, a.officer), act("Loan disbursed", `Net ${sum.netDisbursed.toLocaleString()} via ${method}`), act("Repayment schedule activated")],
        status: "Active", paid: 0, outstanding: 0, overdueAmount: 0, daysOverdue: 0, nextDueAmount: 0,
      }, d.settings.defaultAfterDays)
      const dsb: Disbursement = {
        id: mockId("dsb"), applicationId: a.id, loanId, borrowerName: a.applicant.name, approvedAmount: sum.principal, fees: sum.fees, deductions: sum.deduction,
        netAmount: sum.netDisbursed, destination: method === "Bank transfer" ? "Access Bank •••• 4471" : method === "Wallet credit" ? "Member wallet" : "Branch cash desk",
        method, date: todayISO(), reference: `DSB-${9200 + n}`,
      }
      await this.repo.saveLoan(loan)
      await this.repo.saveDisbursement(dsb)
      for (const g of d.guarantorRequests.filter((g) => g.applicationId === a.id)) await this.repo.saveGuarantorRequest({ ...g, loanId })
      await this.saveApp(a, "Disbursed", act("Loan disbursed", `${loan.reference} is now active`))
      created.push(loan)
    }
    return created
  }

  // Repayments
  async recordRepayment(input: { loanId: string; amount: number; method: RepaymentMethod; date: string; reference: string; note?: string }) {
    const { loan, d } = await this.loan(input.loanId)
    const { schedule, allocation } = allocateRepayment(loan.schedule, input.amount)
    const repayment: LoanRepayment = {
      id: mockId("rp"), loanId: loan.id, loanReference: loan.reference, borrowerName: loan.borrower.name, amount: input.amount, method: input.method,
      date: input.date, reference: input.reference || `RPY${Date.now().toString().slice(-8)}`, status: "Confirmed", allocation, recordedBy: ACTOR, note: input.note,
    }
    const next = deriveLoanState(
      { ...loan, schedule, activity: [...loan.activity, act("Repayment recorded", `${input.amount.toLocaleString()} via ${input.method}`)] },
      d.settings.defaultAfterDays,
    )
    await this.repo.saveRepayment(repayment)
    await this.repo.saveLoan(next)
    const rc = d.recoveryCases.find((c) => c.loanId === loan.id && c.status !== "Resolved")
    if (rc && next.daysOverdue === 0) await this.repo.saveRecoveryCase({ ...rc, status: "Resolved", notes: [...rc.notes, note("Resolved", "Loan brought up to date by repayment.", "System")] })
    return repayment
  }

  // Recovery
  async startRecovery(loanId: string) {
    const d = await this.repo.load()
    if (d.recoveryCases.some((c) => c.loanId === loanId && c.status !== "Resolved")) return
    await this.repo.saveRecoveryCase({ id: mockId("rc"), loanId, status: "Open", assignedTo: "Kemi Adebayo", openedAt: todayISO(), notes: [] })
  }

  async recoveryAction(c: RecoveryCase, type: string, text: string, status?: RecoveryStatus) {
    await this.repo.saveRecoveryCase({ ...c, status: status ?? c.status, notes: [...c.notes, note(type, text)] })
    const { loan } = await this.loan(c.loanId)
    await this.repo.saveLoan({ ...loan, activity: [...loan.activity, act(`Recovery: ${type}`, text)] })
  }

  async markDefaulted(loanId: string) {
    const { loan, d } = await this.loan(loanId)
    await this.repo.saveLoan(deriveLoanState({ ...loan, defaulted: true, activity: [...loan.activity, act("Loan marked as defaulted")] }, d.settings.defaultAfterDays))
  }

  async writeOff(loanId: string) {
    const { loan, d } = await this.loan(loanId)
    await this.repo.saveLoan(deriveLoanState({ ...loan, writtenOff: true, activity: [...loan.activity, act("Loan written off")] }, d.settings.defaultAfterDays))
  }

  async saveSettings(s: RecoverySettings) {
    await this.repo.saveSettings(s)
    const d = await this.repo.load()
    for (const l of d.loans) await this.repo.saveLoan(deriveLoanState(l, s.defaultAfterDays))
  }

  saveForm = (f: LoanApplicationForm) => this.repo.saveForm(f)

  /** Saves a product together with its application form; publishing makes the working version live. */
  async saveProductWithForm(product: LoanProduct, form: LoanApplicationForm, version: FormVersion, publish: boolean) {
    await this.saveProduct(product)
    await this.repo.saveForm(publish ? applyPublish(form, version) : applyDraft(form, version))
  }
  /** Submits an applicant's answers against a specific form version. */
  async submitFormApplication(a: { form: LoanApplicationForm; version: FormVersion; product: LoanProduct; values: Record<string, FormResponseValue>; members: Borrower[]; source: "Internal" | "Public link" }) {
    const x = extractSubmission(a.version, a.values, a.product, a.members)
    return this.createApplication({ ...x, product: a.product, source: a.source, response: { form: a.form, version: a.version, values: a.values } })
  }
  async publishForm(form: LoanApplicationForm, version: FormVersion) {
    await this.repo.saveForm(applyPublish(form, version))
  }
  async archiveForm(form: LoanApplicationForm) {
    await this.repo.saveForm({ ...form, status: "Archived", publishedVersionId: undefined, versions: form.versions.map((v) => (v.status === "Published" ? { ...v, status: "Archived" as const } : v)) })
  }
}

const note = (type: string, text: string, by = ACTOR) => ({ id: mockId("n"), at: todayISO(), type, text, by })

/**
 * One service — and therefore one dataset — per community.
 *
 * The tenant is bound when the service is resolved rather than passed to every one of its methods,
 * because the tenant is ambient: a loan screen always works inside the community the switcher has
 * active, and a call site that could name a different tenant would be a way to read another
 * community's loans. The seeded community gets the seeded dataset and every other community starts
 * with none, so switching shows that community's loans and nothing else.
 *
 * A backend takes the tenant from the authenticated session instead.
 */
const services = new Map<string, LoansService>()

export function loansServiceFor(organizationId: string): LoansService {
  let service = services.get(organizationId)
  if (!service) {
    service = new LoansService(
      createMockLoanRepository(isSeedTenant(organizationId) ? undefined : createEmptyLoanDataset()),
    )
    services.set(organizationId, service)
  }
  return service
}

/** The seeded community's service, for the screens that run without a session (the public link). */
export const loansService = loansServiceFor(SEED_ORGANIZATION_ID)
export type { LoanDataset }
