import { useCallback, useEffect, useRef } from "react"
import { useWorkspace } from "@/app/providers/WorkspaceProvider"
import { corporateAccountService } from "../services/corporate-account.service"
import type { CorporateAccountStatus } from "@/types"
import type { CorporateAccountDetails } from "@/features/onboarding/types"

/**
 * Loads the corporate account state from the backend into the workspace store and persists edits
 * back. The store remains the single source of truth for rendering; a failed save keeps the local
 * state rather than half-updating.
 */
export function useCorporateAccount(organizationId: string) {
  const { state, dispatch } = useWorkspace()
  // Tracks the latest status/details so a draft save and a status change issued in the same tick
  // still persist the combined state (the store update is async).
  const latest = useRef({ status: state.corporateAccountStatus, details: state.corporateDetails })

  useEffect(() => {
    latest.current = { status: state.corporateAccountStatus, details: state.corporateDetails }
  }, [state.corporateAccountStatus, state.corporateDetails])

  useEffect(() => {
    let active = true
    corporateAccountService
      .get(organizationId)
      .then((loaded) => {
        if (!active) return
        dispatch({ type: "corporate-account/details-saved", value: loaded.details })
        dispatch({ type: "corporate-account/status-changed", value: loaded.status })
      })
      .catch(() => {
        // Keep the store's current state on a failed load.
      })
    return () => {
      active = false
    }
  }, [organizationId, dispatch])

  const persist = useCallback(
    (patch: Partial<{ status: CorporateAccountStatus; details: CorporateAccountDetails }>) => {
      const next = { ...latest.current, ...patch }
      void corporateAccountService.update(organizationId, next).catch(() => {})
    },
    [organizationId],
  )

  const saveDetails = useCallback(
    (details: CorporateAccountDetails) => {
      latest.current = { ...latest.current, details }
      dispatch({ type: "corporate-account/details-saved", value: details })
      persist({ details })
    },
    [dispatch, persist],
  )

  const setStatus = useCallback(
    (status: CorporateAccountStatus) => {
      latest.current = { ...latest.current, status }
      dispatch({ type: "corporate-account/status-changed", value: status })
      persist({ status })
    },
    [dispatch, persist],
  )

  return { saveDetails, setStatus }
}
