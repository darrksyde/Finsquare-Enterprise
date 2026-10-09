import { useCallback, useEffect, useState } from "react"
import { loansService } from "../services/loans.service"
import type { LoanDataset } from "../types/loan.types"

export function useLoans() {
  const [data, setData] = useState<LoanDataset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => loansService.subscribe(() => setVersion((v) => v + 1)), [])
  useEffect(() => {
    let active = true
    loansService
      .load()
      .then((d) => active && (setData(d), setError(null)))
      .catch(() => active && setError("Loan data could not be loaded."))
    return () => {
      active = false
    }
  }, [version])

  const retry = useCallback(() => setVersion((v) => v + 1), [])
  return { data, error, retry, service: loansService }
}
