import type {
  Disbursement,
  GuarantorRequest,
  Loan,
  LoanApplication,
  LoanApplicationForm,
  FormResponse,
  LoanDataset,
  LoanProduct,
  LoanRepayment,
  RecoveryCase,
  RecoverySettings,
} from "../types/loan.types"

/** Contract for the loan data source. Swap the mock for an API-backed implementation later. */
export interface LoanRepository {
  load(): Promise<LoanDataset>
  saveProduct(product: LoanProduct): Promise<void>
  saveApplication(application: LoanApplication): Promise<void>
  saveLoan(loan: Loan): Promise<void>
  saveRepayment(repayment: LoanRepayment): Promise<void>
  saveGuarantorRequest(request: GuarantorRequest): Promise<void>
  saveDisbursement(disbursement: Disbursement): Promise<void>
  saveRecoveryCase(recoveryCase: RecoveryCase): Promise<void>
  saveForm(form: LoanApplicationForm): Promise<void>
  saveResponse(response: FormResponse): Promise<void>
  saveSettings(settings: RecoverySettings): Promise<void>
  subscribe(listener: () => void): () => void
}
