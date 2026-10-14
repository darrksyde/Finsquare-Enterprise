import { createLoanDataset } from "../mocks/loans.mock"
import type { LoanDataset } from "../types/loan.types"
import type { LoanRepository } from "./loan.repository"

function upsert<T extends { id: string }>(list: T[], item: T, front = false): T[] {
  return list.some((x) => x.id === item.id)
    ? list.map((x) => (x.id === item.id ? item : x))
    : front
      ? [item, ...list]
      : [...list, item]
}

export function createMockLoanRepository(initial?: LoanDataset): LoanRepository {
  let data: LoanDataset = initial ?? createLoanDataset()
  const listeners = new Set<() => void>()
  const commit = async (next: Partial<LoanDataset>) => {
    data = { ...data, ...next }
    listeners.forEach((l) => l())
  }
  const wait = () => new Promise((r) => setTimeout(r, 120))

  return {
    async load() {
      await wait()
      return data
    },
    saveProduct: (p) => commit({ products: upsert(data.products, p, true) }),
    saveApplication: (a) => commit({ applications: upsert(data.applications, a, true) }),
    saveLoan: (l) => commit({ loans: upsert(data.loans, l, true) }),
    saveRepayment: (r) => commit({ repayments: upsert(data.repayments, r, true) }),
    saveGuarantorRequest: (g) => commit({ guarantorRequests: upsert(data.guarantorRequests, g, true) }),
    saveDisbursement: (d) => commit({ disbursements: upsert(data.disbursements, d, true) }),
    saveRecoveryCase: (c) => commit({ recoveryCases: upsert(data.recoveryCases, c, true) }),
    saveForm: (f) => commit({ forms: upsert(data.forms, f, true) }),
    saveResponse: (r) => commit({ responses: upsert(data.responses, r, true) }),
    saveSettings: (settings) => commit({ settings }),
    subscribe(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
  }
}
