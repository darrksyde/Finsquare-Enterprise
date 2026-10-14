import { useCallback, useEffect, useState } from "react"
import { useOrganizationId } from "@/hooks/useOrganizationId"
import { loansServiceFor } from "../services/loans.service"
import type { LoanDataset } from "../types/loan.types"

/**
 * Loans for one named community. Used by the screens that run without a session, where the tenant
 * cannot come from the active community.
 */
export function useLoansFor(organizationId: string, enabled = true) {
  const [loaded, setLoaded] = useState<{ organizationId: string; data: LoanDataset } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const service = loansServiceFor(organizationId)

  useEffect(() => service.subscribe(() => setVersion((v) => v + 1)), [service])

  useEffect(() => {
    if (!enabled) return
    let active = true
    service
      .load()
      .then((d) => active && (setLoaded({ organizationId, data: d }), setError(null)))
      .catch(() => active && setError("Loan data could not be loaded."))
    return () => {
      active = false
    }
  }, [service, organizationId, enabled, version])

  // The loaded dataset remembers which community it belongs to, so `loading` is derived rather than
  // set: switching community can never show the previous community's loans under the new name.
  const data = loaded && loaded.organizationId === organizationId ? loaded.data : null

  const retry = useCallback(() => setVersion((v) => v + 1), [])
  return { data, error, retry, service }
}

/** The active community's loans. The tenant comes from the switcher, never from a call site. */
export function useLoans() {
  return useLoansFor(useOrganizationId())
}
