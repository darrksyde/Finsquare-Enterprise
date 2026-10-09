import type { LoanProduct } from "@/types"

export interface FinancialOperationsService {
  createLoanProduct(
    organizationId: string,
    input: Omit<LoanProduct, "id">,
  ): Promise<LoanProduct>
  approveLoan(organizationId: string, loanId: string): Promise<void>
  rejectLoan(
    organizationId: string,
    loanId: string,
    reason: string,
  ): Promise<void>
  disburseLoan(organizationId: string, loanId: string): Promise<void>
  recordRepayment(
    organizationId: string,
    loanId: string,
    amount: number,
  ): Promise<void>
}

function withId<T extends object>(
  prefix: string,
  input: T,
): T & { id: string } {
  return { ...input, id: `${prefix}-demo-${Date.now()}` }
}

export const financialOperationsService: FinancialOperationsService = {
  async createLoanProduct(_organizationId, input) {
    return withId("loan-product", input)
  },
  async approveLoan() {},
  async rejectLoan() {},
  async disburseLoan() {},
  async recordRepayment() {},
}
