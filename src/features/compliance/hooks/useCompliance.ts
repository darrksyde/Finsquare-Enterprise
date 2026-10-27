import { useCallback, useEffect } from "react"
import { useWorkspace } from "@/app/providers/WorkspaceProvider"
import { complianceService } from "../services/compliance.service"
import type { ComplianceDocumentStatus } from "@/types"

/**
 * Loads the compliance checklist from the backend into the workspace store, and persists status
 * changes back. The store stays the single source of truth for rendering, so a failed save keeps
 * the UI consistent rather than half-updated.
 */
export function useCompliance(organizationId: string) {
  const { state, dispatch } = useWorkspace()
  const statuses = state.complianceDocuments

  useEffect(() => {
    let active = true
    complianceService
      .getStatuses(organizationId)
      .then((loaded) => {
        if (active) dispatch({ type: "compliance/synced", value: loaded })
      })
      .catch(() => {
        // Keep whatever the store already has on a failed load.
      })
    return () => {
      active = false
    }
  }, [organizationId, dispatch])

  const setStatus = useCallback(
    async (index: number, status: ComplianceDocumentStatus) => {
      const next = statuses.map((current, i) => (i === index ? status : current))
      dispatch({ type: "compliance/document-updated", index, value: status })
      try {
        await complianceService.updateStatuses(organizationId, next)
      } catch {
        // The optimistic local update stands; the next load reconciles it.
      }
    },
    [organizationId, statuses, dispatch],
  )

  return { statuses, setStatus }
}
