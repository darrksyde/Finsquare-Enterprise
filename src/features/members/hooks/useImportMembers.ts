import { useCallback, useState } from "react"
import { getUserErrorMessage } from "@/lib/errors/get-user-message"
import { membersService } from "../services/members.service"
import type { ImportTarget } from "../domain/member-import"
import type { MemberImportResult } from "@/types"

/**
 * Imports members from a CSV upload. The repository owns the parsing and returns a per-row
 * outcome, so the caller shows what actually happened rather than assuming a total.
 */
export function useImportMembers(organizationId: string) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(
    async (file: File, mapping?: ImportTarget[]): Promise<MemberImportResult | null> => {
      setBusy(true)
      setError(null)
      try {
        return await membersService.import(organizationId, file, mapping)
      } catch (reason) {
        setError(getUserErrorMessage(reason))
        return null
      } finally {
        setBusy(false)
      }
    },
    [organizationId],
  )

  return { run, busy, error }
}
