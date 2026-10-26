import { apiClient, ApiError, endpoints } from "@/services/api"
import type {
  Borrower,
  Disbursement,
  Guarantor,
  GuarantorRequest,
  GuarantorStatus,
  Loan,
  LoanApplication,
  LoanDataset,
  LoanProduct,
  LoanRepayment,
  NewApplicationInput,
  RecordRepaymentInput,
  RecoveryCase,
  RecoverySettings,
  RecoveryStatus,
} from "../types/loan.types"
import type { LoanRepository } from "./loan.repository"

// ── Backend DTO shapes (after the API client unwraps `{ success, data }`) ─────

interface LoanTypeDTO {
  id: string
  name: string
  description?: string | null
  isActive: boolean
  minAmount: number
  maxAmount: number
  minDuration: number
  maxDuration: number
  durationUnit: string
  interestType: string
  interestRate: number
  hasApplicationFee?: boolean
  applicationFeeType?: string
  applicationFeeValue?: number
  deductFeeAtDisbursement?: boolean
  repaymentFrequency: string
  enableAutoDebit?: boolean
  minMembershipDurationMonths?: number
  requireSavingsHistory?: boolean
  maxActiveLoans?: number
  gracePeriodDays?: number
  requiresGuarantor?: boolean
  guarantorCount?: number
  guarantorType?: "INTERNAL" | "EXTERNAL"
  requireAdminApproval?: boolean
  requiredCustomFieldNames?: string[]
  createdAt?: string
  updatedAt?: string
  applicationFeePct?: number
  deductionModel?: "None" | "Fees at disbursement" | "Interest & fees at disbursement"
  requiresApproval?: boolean
  allowExternalGuarantors?: boolean
  requireGuarantorVerification?: boolean
  requireGuarantorDocuments?: boolean
  applicationType?: "Internal" | "External" | "Both"
  eligibility?: {
    minMembershipMonths: number
    minSavingsBalance: number
    blockIfOverdueLoan: boolean
    requireKyc: boolean
  }
}

interface LoanApplicationDTO {
  id: string
  amount: number
  purpose: string
  status: string
  appliedAt: string
  reviewedAt: string | null
  reviewNote: string | null
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    phoneNumber?: string | null
    walletTier?: string | null
    address?: string | null
    dob?: string | null
    gender?: string | null
  }
  bankAccount?: unknown
  customFields?: Record<string, unknown>
  membershipJoinedAt?: string | null
  loanType?: {
    id: string
    name: string
    interestRate: number
    interestType: string
    minAmount: number
    maxAmount: number
    durationUnit: string
    minDuration: number
    maxDuration: number
    repaymentFrequency: string
    requiresGuarantor?: boolean
    guarantorCount?: number
    guarantorType?: string
  }
  interestAmount?: number
  totalRepayment?: number
  monthlyPayment?: number
  duration?: number
  durationUnit?: string
  creditScore?: number | null
  creditScoreBucket?: string | null
  riskLevel?: string | null
  guarantors?: Array<{ userId: string; name: string; status: string }>
  externalGuarantors?: Array<{
    id: string
    name: string
    phone?: string
    email?: string | null
    relationship?: string | null
    address?: string | null
    occupation?: string | null
    isVerified?: boolean
    verifiedBy?: string | null
    verifiedAt?: string | null
    note?: string | null
  }>
  applicationFee?: number
  documents?: Array<unknown>
  eligibilityChecks?: Array<unknown>
  revisedOffer?: { amount: number; duration: number; note?: string | null } | null
}

interface ActiveLoanDTO {
  id: string
  applicationId: string
  loanType: string
  interestRate: number
  interestType: string
  repaymentFrequency: string
  purpose: string
  borrower: { id: string; fullName: string; firstName: string; lastName: string; email: string; phoneNumber: string | null }
  principalAmount: number
  totalRepaid: number
  outstandingBalance: number
  totalLoanAmount: number
  repaidPercent: number
  duration: number
  durationUnit: string
  disbursementDate: string | null
  disbursementMethod: string
  gracePeriodDays: number
  status: string
  autoDebitEnabled: boolean
  schedule: {
    completed: number
    total: number
    nextPaymentDate: string | null
    nextPaymentAmount: number
    items: Array<{ number: number; amount: number; dueDate: string | null; isPaid: boolean; paidAt: string | null; status?: string; balance?: number }>
  }
  recentRepayments: Array<{ id: string; amount: number; paidAt: string; reference: string }>
  netDisbursed?: number
  applicationFee?: number
  deduction?: number
  daysOverdue?: number
  overdueAmount?: number
  endDate?: string | null
  officerId?: string | null
}

interface RepaymentDTO {
  id: string
  amount: number
  paidAt: string
  reference: string
  loanId: string
  loanTypeName: string
  purpose: string
  borrower: { id: string; name: string; email: string }
  scheduleItem: { number: number; amount: number; dueDate: string | null } | null
  loan: { principalAmount: number; outstandingBalance: number; totalRepaid: number; totalLoanAmount: number }
}

interface DisbursementLogDTO {
  id: string
  applicationId: string
  applicant: { id: string; fullName: string; email: string; phoneNumber: string } | null
  loanType: string
  purpose: string
  amount: number
  status: string
  attempts: number
  lastError: string | null
  lastAttemptAt: string | null
  reference: string | null
  createdAt: string
}

interface RecoveryCaseDTO {
  id: string
  loanId: string
  status: string
  assignedTo: string | null
  openedAt: string
  notes: Array<{ id: string; at: string; type: string; text: string; by: string }>
}

interface EnterpriseLoansDTO {
  loans: ActiveLoanDTO[]
  recoveryCases: RecoveryCaseDTO[]
  settings: { defaultAfterDays: number; reminderAfterDays: number }
}

// ── Mapping helpers ───────────────────────────────────────────────────────────

const durUnit = (v: string): "Days" | "Weeks" | "Months" =>
  v.toLowerCase().startsWith("day") ? "Days" : v.toLowerCase().startsWith("week") ? "Weeks" : "Months"

const interestType = (v: string): "Flat" | "Reducing balance" | "Zero interest" =>
  v.toLowerCase().includes("reduc") ? "Reducing balance" : "Flat"

const freq = (v: string): "Daily" | "Weekly" | "Biweekly" | "Monthly" =>
  v.toLowerCase().startsWith("day") ? "Daily" : v.toLowerCase().startsWith("week") ? "Weekly" : "Monthly"

const appStatus = (v: string): LoanApplication["status"] => {
  switch (v) {
    case "APPROVED": return "Approved"
    case "REJECTED": return "Rejected"
    case "ACTIVE":
    case "AWAITING_DISBURSEMENT":
    case "DISBURSED": return "Disbursed"
    case "COMPLETED": return "Disbursed"
    case "DEFAULTED": return "Rejected"
    case "RESTRUCTURED": return "Approved"
    case "INFO_REQUESTED": return "Under Review"
    case "CANCELLED": return "Cancelled"
    case "OFFER_SENT": return "Offer Sent"
    case "OFFER_ACCEPTED": return "Offer Accepted"
    case "PENDING":
    default: return "Submitted"
  }
}

function mapProduct(dto: LoanTypeDTO): LoanProduct {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? "",
    minAmount: dto.minAmount,
    maxAmount: dto.maxAmount,
    minDuration: dto.minDuration,
    maxDuration: dto.maxDuration,
    durationUnit: durUnit(dto.durationUnit),
    interestType: interestType(dto.interestType),
    interestRate: dto.interestRate,
    applicationFeePct: dto.applicationFeePct ?? (dto.hasApplicationFee && dto.applicationFeeType === "percentage" ? dto.applicationFeeValue ?? 0 : 0),
    deductionModel: dto.deductionModel ?? (dto.deductFeeAtDisbursement ? "Fees at disbursement" : "None"),
    frequency: freq(dto.repaymentFrequency),
    maxActiveLoans: dto.maxActiveLoans ?? 1,
    graceDays: dto.gracePeriodDays ?? 0,
    requiresApproval: dto.requiresApproval ?? dto.requireAdminApproval ?? true,
    requiresGuarantor: dto.requiresGuarantor ?? false,
    guarantorsRequired: dto.guarantorCount ?? 0,
    applicationType: dto.applicationType ?? (dto.guarantorType === "EXTERNAL" ? "External" : "Both"),
    allowExternalGuarantors: dto.allowExternalGuarantors ?? dto.guarantorType === "EXTERNAL",
    requireGuarantorVerification: dto.requireGuarantorVerification ?? false,
    requireGuarantorDocuments: dto.requireGuarantorDocuments ?? false,
    eligibility: dto.eligibility ?? {
      minMembershipMonths: dto.minMembershipDurationMonths ?? 0,
      minSavingsBalance: 0,
      blockIfOverdueLoan: false,
      requireKyc: false,
    },
    status: dto.isActive ? "Active" : "Inactive",
    updatedAt: dto.updatedAt ?? dto.createdAt ?? "",
  }
}

function borrowerFromUser(u: LoanApplicationDTO["user"]): Borrower {
  return {
    id: u.id,
    name: [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email,
    phone: u.phoneNumber ?? "",
    email: u.email,
    type: "Member",
    memberId: u.id,
    branch: "",
    address: u.address ?? "",
    occupation: "",
    membershipMonths: 0,
    savingsBalance: 0,
    kycVerified: !!u.walletTier,
  }
}

function mapApplication(dto: LoanApplicationDTO): LoanApplication {
  const applicant = borrowerFromUser(dto.user)
  return {
    id: dto.id,
    reference: dto.id,
    applicant,
    productId: dto.loanType?.id ?? "",
    productName: dto.loanType?.name ?? "",
    terms: {
      amount: dto.amount,
      duration: dto.duration ?? 1,
      durationUnit: durUnit(dto.durationUnit ?? dto.loanType?.durationUnit ?? "months"),
      interestType: interestType(dto.loanType?.interestType ?? "FLAT_RATE"),
      interestRate: dto.loanType?.interestRate ?? 0,
      applicationFeePct: 0,
      deductionModel: "None",
      frequency: freq(dto.loanType?.repaymentFrequency ?? "monthly"),
      graceDays: 0,
    },
    purpose: dto.purpose,
    source: "Public link",
    status: appStatus(dto.status),
    approvedAmount: dto.status === "APPROVED" ? dto.amount : undefined,
    rejectionReason: dto.status === "REJECTED" ? dto.reviewNote ?? undefined : undefined,
    infoRequest: dto.status === "INFO_REQUESTED" ? dto.reviewNote ?? undefined : undefined,
    revisedOffer: dto.revisedOffer
      ? { amount: dto.revisedOffer.amount, duration: dto.revisedOffer.duration, note: dto.revisedOffer.note ?? "" }
      : undefined,
    officer: "",
    submittedAt: dto.appliedAt,
    employment: "",
    monthlyIncome: 0,
    documents: (dto.documents ?? []).map((doc, index) => {
      const raw = doc as { id?: string; name?: string; type?: string; uploadedAt?: string }
      const name = raw.name ?? (typeof doc === "string" ? doc : `Document ${index + 1}`)
      return {
        id: raw.id ?? `doc-${dto.id}-${index}`,
        name,
        type: raw.type ?? "Upload",
        uploadedAt: raw.uploadedAt ?? dto.appliedAt,
        review: "Pending review" as const,
      }
    }),
    eligibility: { outcome: "Eligible", checks: [] },
    activity: [],
  }
}

function mapLoan(dto: ActiveLoanDTO): Loan {
  return {
    id: dto.id,
    reference: dto.id,
    applicationId: dto.applicationId,
    borrower: {
      id: dto.borrower.id,
      name: dto.borrower.fullName,
      phone: dto.borrower.phoneNumber ?? "",
      email: dto.borrower.email,
      type: "Member",
      memberId: dto.borrower.id,
      branch: "",
      address: "",
      occupation: "",
      membershipMonths: 0,
      savingsBalance: 0,
      kycVerified: true,
    },
    productId: "",
    productName: dto.loanType,
    terms: {
      amount: dto.principalAmount,
      duration: dto.duration,
      durationUnit: durUnit(dto.durationUnit),
      interestType: interestType(dto.interestType),
      interestRate: dto.interestRate,
      applicationFeePct: 0,
      deductionModel: "None",
      frequency: freq(dto.repaymentFrequency),
      graceDays: dto.gracePeriodDays,
    },
    principal: dto.principalAmount,
    interest: 0,
    fees: dto.applicationFee ?? 0,
    deduction: dto.deduction ?? 0,
    netDisbursed: dto.netDisbursed ?? dto.principalAmount,
    totalRepayable: dto.totalLoanAmount,
    installment: dto.schedule.total > 0 ? Math.round(dto.totalLoanAmount / dto.schedule.total) : dto.totalLoanAmount,
    disbursedAt: dto.disbursementDate ?? "",
    endDate: dto.endDate ?? dto.schedule.items[dto.schedule.items.length - 1]?.dueDate ?? "",
    schedule: dto.schedule.items.map((item) => ({
      no: item.number,
      dueDate: item.dueDate ?? "",
      amount: item.amount,
      principal: item.amount,
      interest: 0,
      paid: item.isPaid ? item.amount : 0,
      balance: item.balance ?? (item.isPaid ? 0 : item.amount),
      status: item.status === "PAID" ? "Paid" : item.status === "OVERDUE" ? "Overdue" : item.isPaid ? "Paid" : "Upcoming",
    })),
    virtualAccount: { accountNumber: "", accountName: "", bank: "", reference: "", status: "Active" },
    officer: dto.officerId ?? "",
    documents: [],
    activity: [],
    status: dto.status === "DEFAULTED" ? "Defaulted" : dto.status === "WRITTEN_OFF" ? "Written Off" : dto.status === "COMPLETED" ? "Completed" : (dto.daysOverdue ?? 0) > 0 ? "Overdue" : "Active",
    defaulted: dto.status === "DEFAULTED",
    writtenOff: dto.status === "WRITTEN_OFF",
    paid: dto.totalRepaid,
    outstanding: dto.outstandingBalance,
    overdueAmount: dto.overdueAmount ?? 0,
    daysOverdue: dto.daysOverdue ?? 0,
    nextDueDate: dto.schedule.nextPaymentDate ?? undefined,
    nextDueAmount: dto.schedule.nextPaymentAmount,
  }
}

function mapRepayment(dto: RepaymentDTO): LoanRepayment {
  return {
    id: dto.id,
    loanId: dto.loanId,
    loanReference: dto.loanId,
    borrowerName: dto.borrower.name,
    amount: dto.amount,
    method: "Bank transfer",
    date: dto.paidAt,
    reference: dto.reference,
    status: "Confirmed",
    allocation: dto.scheduleItem ? [{ no: dto.scheduleItem.number, amount: dto.amount }] : [],
    recordedBy: "System",
  }
}

function mapDisbursement(dto: DisbursementLogDTO): Disbursement {
  return {
    id: dto.id,
    applicationId: dto.applicationId,
    loanId: "",
    borrowerName: dto.applicant?.fullName ?? "",
    approvedAmount: dto.amount,
    fees: 0,
    deductions: 0,
    netAmount: dto.amount,
    destination: "Bank transfer",
    method: "Bank transfer",
    date: dto.createdAt,
    reference: dto.reference ?? dto.id,
  }
}

const DEFAULT_SETTINGS: RecoverySettings = { defaultAfterDays: 60, reminderAfterDays: 3 }

function mapRecoveryCase(dto: RecoveryCaseDTO): RecoveryCase {
  return {
    id: dto.id,
    loanId: dto.loanId,
    status: dto.status as RecoveryStatus,
    assignedTo: dto.assignedTo ?? "",
    openedAt: dto.openedAt,
    notes: (dto.notes ?? []).map((note) => ({
      id: note.id,
      at: note.at,
      type: note.type,
      text: note.text,
      by: note.by,
    })),
  }
}

function notAvailable(feature: string): never {
  throw new ApiError(`${feature} is not available on the MFI backend yet.`, "not_found")
}

/**
 * API-backed loan repository, wired to the MFI staff endpoints.
 *
 * Reads assemble the same `LoanDataset` the mock produces; commands map onto the named backend
 * actions. Commands the backend does not expose yet throw a user-safe error rather than pretending.
 */
export class ApiLoanRepository implements LoanRepository {
  private listeners = new Set<() => void>()

  private notify() {
    this.listeners.forEach((listener) => listener())
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => void this.listeners.delete(listener)
  }

  async load(): Promise<LoanDataset> {
    const [types, applicationsPage, enterprise, repaymentsPage, logs] = await Promise.all([
      apiClient.get<LoanTypeDTO[]>(endpoints.loans.types),
      apiClient.get<{ applications: LoanApplicationDTO[] }>(endpoints.loans.applications),
      apiClient.get<EnterpriseLoansDTO>(endpoints.loans.enterpriseLoans),
      apiClient.get<{ repayments: RepaymentDTO[] }>(endpoints.loans.repayments),
      apiClient.get<DisbursementLogDTO[]>(endpoints.loans.disbursementLogs),
    ])

    const products = types.map(mapProduct)
    const applications = applicationsPage.applications.map(mapApplication)
    const loans = enterprise.loans.map(mapLoan)
    const repayments = repaymentsPage.repayments.map(mapRepayment)
    const disbursements = logs.map(mapDisbursement)
    const recoveryCases = enterprise.recoveryCases.map(mapRecoveryCase)
    const settings = enterprise.settings ?? DEFAULT_SETTINGS

    const guarantorRequests: GuarantorRequest[] = []
    const borrowers: Borrower[] = []
    const guarantors: Guarantor[] = []
    for (const dto of applicationsPage.applications) {
      borrowers.push(borrowerFromUser(dto.user))
      for (const g of dto.guarantors ?? [])
        guarantors.push({ id: g.userId, name: g.name, phone: "", relationship: "", type: "Member", memberId: g.userId, occupation: "" })
      for (const g of dto.externalGuarantors ?? []) {
        const guarantor: Guarantor = { id: g.id, name: g.name, phone: g.phone ?? "", relationship: g.relationship ?? "", type: "External", occupation: g.occupation ?? "" }
        guarantors.push(guarantor)
        guarantorRequests.push({
          id: `ext-${g.id}`,
          applicationId: dto.id,
          guarantor,
          amount: 0,
          status: g.isVerified ? "Verified" : "Pending",
          notes: g.note ?? "",
          documents: [],
          updatedAt: g.verifiedAt ?? "",
        })
      }
    }
    for (const loan of loans) borrowers.push(loan.borrower)

    return {
      products,
      applications,
      loans,
      repayments,
      guarantorRequests,
      disbursements,
      recoveryCases,
      forms: [],
      responses: [],
      settings,
      borrowers,
      guarantors,
    }
  }

  async saveProduct(product: LoanProduct): Promise<void> {
    const payload = {
      name: product.name,
      description: product.description,
      minAmount: product.minAmount,
      maxAmount: product.maxAmount,
      minDuration: product.minDuration,
      maxDuration: product.maxDuration,
      durationUnit: product.durationUnit.toLowerCase(),
      interestType: product.interestType === "Reducing balance" ? "reducingBalance" : "flatRate",
      interestRate: product.interestRate,
      hasApplicationFee: product.applicationFeePct > 0,
      applicationFeeType: "percentage",
      applicationFeeValue: product.applicationFeePct,
      deductFeeAtDisbursement: product.deductionModel !== "None",
      repaymentFrequency: product.frequency === "Daily" ? "daily" : product.frequency === "Weekly" ? "weekly" : "monthly",
      maxActiveLoans: product.maxActiveLoans,
      gracePeriodDays: product.graceDays,
      requiresGuarantor: product.requiresGuarantor,
      guarantorCount: product.guarantorsRequired,
      guarantorType: product.allowExternalGuarantors ? "EXTERNAL" : "INTERNAL",
      requireAdminApproval: product.requiresApproval,
      minMembershipDurationMonths: product.eligibility.minMembershipMonths,
      requireSavingsHistory: product.eligibility.minSavingsBalance > 0,
    }
    const existing = (await this.load()).products.some((p) => p.id === product.id)
    if (existing) {
      await apiClient.put(endpoints.loans.type(product.id), payload)
    } else {
      await apiClient.post(endpoints.loans.types, payload)
    }
    this.notify()
  }

  async approve(id: string, amount: number, note: string): Promise<void> {
    const app = (await this.load()).applications.find((a) => a.id === id)
    if (!app) throw new ApiError("Application not found", "not_found")
    if (amount !== app.terms.amount) {
      await apiClient.post(endpoints.loans.offer(id), {
        amount,
        duration: app.terms.duration,
        note: note || undefined,
      })
    } else {
      await apiClient.post(endpoints.loans.approve(id), { note: note || undefined })
    }
    this.notify()
  }

  async reject(id: string, reason: string): Promise<void> {
    await apiClient.post(endpoints.loans.reject(id), { note: reason })
    this.notify()
  }

  async updateGuarantor(
    req: GuarantorRequest,
    status: GuarantorStatus,
    _method: GuarantorRequest["verificationMethod"],
    notes: string,
    _signedForm: boolean,
  ): Promise<void> {
    void _method
    void _signedForm
    if (!req.applicationId) return notAvailable("Guarantor verification")
    const verified = status === "Verified" || status === "Accepted"
    await apiClient.post(endpoints.loans.verifyGuarantor(req.applicationId, req.guarantor.id), {
      isVerified: verified,
      note: notes || undefined,
    })
    this.notify()
  }

  async createApplication(input: NewApplicationInput): Promise<LoanApplication> {
    const response = await apiClient.post<{
      id: string
      status: string
      amount: number
      purpose: string
      loanTypeId: string
      applicantId: string
    }>(endpoints.loans.create, {
      userId: input.applicant.id,
      loanTypeId: input.product.id,
      amount: input.terms.amount,
      duration: input.terms.duration,
      purpose: input.purpose,
      externalGuarantors: (input.guarantors ?? []).map((g) => ({
        name: g.guarantor.name,
        phone: g.guarantor.phone,
        relationship: g.guarantor.relationship,
        occupation: g.guarantor.occupation,
      })),
    })
    this.notify()
    // The pages re-fetch the dataset after the notify; return a minimal application for the caller.
    return {
      id: response.id,
      reference: response.id,
      applicant: input.applicant,
      productId: response.loanTypeId,
      productName: input.product.name,
      terms: input.terms,
      purpose: response.purpose,
      source: input.source,
      status: appStatus(response.status),
      officer: "",
      submittedAt: new Date().toISOString(),
      employment: input.employment,
      monthlyIncome: input.monthlyIncome,
      documents: [],
      eligibility: { outcome: "Eligible", checks: [] },
      activity: [],
    }
  }
  async startReview(): Promise<void> {
    // The backend has no separate "under review" state; PENDING applications are already awaiting review.
  }
  async reviseOffer(id: string, amount: number, duration: number, note: string): Promise<void> {
    await apiClient.post(endpoints.loans.offer(id), {
      amount,
      duration,
      note: note || undefined,
    })
    this.notify()
  }
  async acceptOffer(id: string): Promise<void> {
    await apiClient.post(endpoints.loans.acceptOffer(id))
    this.notify()
  }
  async requestInfo(id: string, message: string): Promise<void> {
    await apiClient.post(endpoints.loans.requestInfo(id), { message })
    this.notify()
  }
  async cancel(id: string): Promise<void> {
    await apiClient.post(endpoints.loans.cancel(id))
    this.notify()
  }
  async reviewDocument(): Promise<void> {
    return notAvailable("Document review")
  }
  async addGuarantor(): Promise<void> {
    return notAvailable("Adding guarantors")
  }
  async disburse(): Promise<Loan[]> {
    return notAvailable("Disbursement (requires a transaction PIN)")
  }
  async recordRepayment(input: RecordRepaymentInput): Promise<LoanRepayment> {
    if (!input.pin) {
      throw new ApiError("A wallet PIN is required to record a repayment", "validation")
    }
    const response = await apiClient.post<{
      id: string
      amount: number
      paidAt: string
      reference: string
      loanId: string
      method: string | null
      note: string | null
      recordedByName: string | null
    }>(endpoints.loans.repay(input.loanId), {
      amount: input.amount,
      method: input.method,
      date: input.date,
      reference: input.reference || undefined,
      note: input.note || undefined,
      pin: input.pin,
    })
    this.notify()
    return {
      id: response.id,
      loanId: response.loanId,
      loanReference: response.loanId,
      borrowerName: "",
      amount: response.amount,
      method: input.method,
      date: response.paidAt,
      reference: response.reference,
      status: "Confirmed",
      allocation: [],
      recordedBy: response.recordedByName ?? "Staff",
      note: response.note ?? undefined,
    }
  }
  async startRecovery(loanId: string): Promise<void> {
    await apiClient.post(endpoints.loans.startRecovery(loanId))
    this.notify()
  }
  async recoveryAction(c: RecoveryCase, type: string, text: string, status?: RecoveryStatus): Promise<void> {
    await apiClient.post(endpoints.loans.recoveryActions(c.id), {
      type,
      text,
      status: status || undefined,
    })
    this.notify()
  }
  async markDefaulted(loanId: string): Promise<void> {
    await apiClient.post(endpoints.loans.markDefaulted(loanId))
    this.notify()
  }
  async writeOff(loanId: string): Promise<void> {
    await apiClient.post(endpoints.loans.writeOff(loanId))
    this.notify()
  }
  async saveSettings(s: RecoverySettings): Promise<void> {
    await apiClient.patch(endpoints.loans.recoverySettings, {
      defaultAfterDays: s.defaultAfterDays,
      reminderAfterDays: s.reminderAfterDays,
    })
    this.notify()
  }
  async saveForm(): Promise<void> {
    return notAvailable("Application form editing")
  }
  async saveProductWithForm(): Promise<void> {
    return notAvailable("Application form editing")
  }
  async submitFormApplication(): Promise<LoanApplication> {
    return notAvailable("Submitting applications internally")
  }
  async publishForm(): Promise<void> {
    return notAvailable("Publishing application forms")
  }
  async archiveForm(): Promise<void> {
    return notAvailable("Archiving application forms")
  }
}
