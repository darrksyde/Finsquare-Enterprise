import { useEffect, useState } from "react"
import { groupsService } from "@/features/groups/services/groups.service"
import { COMMUNICATION_ORG_ID } from "../constants"
import type { GroupMembership } from "@/types"

/**
 * The membership rows for the groups the administrator has selected.
 *
 * Only the selected groups are fetched, and membership is read at selection time rather than up
 * front, so opening Communications does not read a row per group in the organization. The backend
 * will do this in one call; `resolveRecipients` stays the same either way.
 */
export function useGroupMemberships(groupIds: string[]): GroupMembership[] {
  const [memberships, setMemberships] = useState<GroupMembership[]>([])
  // Re-fetch only when the set of groups changes, not when the array identity does.
  const key = [...groupIds].sort().join(",")

  useEffect(() => {
    let active = true
    const load: Promise<GroupMembership[]> =
      groupIds.length === 0
        ? Promise.resolve([])
        : Promise.all(
            groupIds.map((groupId) => groupsService.getGroupMembers(COMMUNICATION_ORG_ID, groupId)),
          ).then((rows) => rows.flat())

    load
      .then((rows) => {
        if (active) setMemberships(rows)
      })
      .catch(() => {
        if (active) setMemberships([])
      })
    return () => {
      active = false
    }
    // `key` is the group set; `groupIds` identity changes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return memberships
}
