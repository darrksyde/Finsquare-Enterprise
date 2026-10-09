import { useCallback, useState } from "react"
import { getUserErrorMessage } from "@/lib/errors/get-user-message"
import { membersService } from "../services/members.service"
import type { CreateMemberInput, Member } from "@/types"

/** Creates one member record. Shared by the manual add form and the application review. */
export function useCreateMember(organizationId: string) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(
    async (input: CreateMemberInput): Promise<Member | null> => {
      setBusy(true)
      setError(null)
      try {
        return await membersService.create(organizationId, input)
      } catch (reason) {
        setError(getUserErrorMessage(reason))
        return null
      } finally {
        setBusy(false)
      }
    },
    [organizationId],
  )

  return { create, busy, error }
}
