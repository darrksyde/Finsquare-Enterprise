import { useCallback, useEffect, useState } from "react"
import { getUserErrorMessage } from "@/lib/errors/get-user-message"
import { membersService } from "../services/members.service"
import { MEMBER_ORG_ID } from "../constants"
import type { AsyncStatus, Member } from "@/types"

/**
 * One member, by id. The profile is reachable per member, so it loads the record it was asked
 * for rather than reusing whatever the list happened to have in memory.
 *
 * The loaded record remembers which id it belongs to, so `loading` is derived instead of set:
 * navigating from one member to another can never show the previous member's figures under the
 * new member's name.
 */
export function useMember(memberId: string) {
  const [loaded, setLoaded] = useState<{ id: string; member: Member | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => membersService.subscribe(() => setVersion((value) => value + 1)), [])

  useEffect(() => {
    let active = true
    membersService
      .getById(MEMBER_ORG_ID, memberId)
      .then((result) => {
        if (!active) return
        setLoaded({ id: memberId, member: result })
        setError(null)
      })
      .catch((reason: unknown) => {
        if (active) setError(getUserErrorMessage(reason))
      })
    return () => {
      active = false
    }
  }, [memberId, version])

  const retry = useCallback(() => setVersion((value) => value + 1), [])
  const current = loaded && loaded.id === memberId ? loaded : null
  const status: AsyncStatus = error ? "error" : current ? "success" : "loading"

  return { member: current?.member ?? null, status, error, retry }
}
