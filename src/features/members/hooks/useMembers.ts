import { useCallback, useEffect, useState } from "react"
import { getUserErrorMessage } from "@/lib/errors/get-user-message"
import type { AsyncStatus, Member } from "@/types"
import { membersService } from "../services/members.service"

export function useMembers(organizationId: string) {
  const [members, setMembers] = useState<Member[]>([])
  const [status, setStatus] = useState<AsyncStatus>("loading")
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setMembers(await membersService.getAll(organizationId))
      setStatus("success")
      setError(null)
    } catch (reason) {
      setError(getUserErrorMessage(reason))
      setStatus("error")
    }
  }, [organizationId])

  // A member created from an application, or added by hand, has to show up in this list.
  useEffect(() => membersService.subscribe(() => { void load() }), [load])

  useEffect(() => {
    let active = true
    membersService
      .getAll(organizationId)
      .then((result) => {
        if (!active) return
        setMembers(result)
        setStatus("success")
      })
      .catch((reason: unknown) => {
        if (!active) return
        setError(getUserErrorMessage(reason))
        setStatus("error")
      })
    return () => {
      active = false
    }
  }, [organizationId])

  return { members, status, error, retry: load }
}
