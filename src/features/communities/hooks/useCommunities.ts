import { useCallback, useState } from "react"
import { getUserErrorMessage } from "@/lib/errors/get-user-message"
import { useAsyncResource } from "@/hooks/useAsyncResource"
import { communitiesService } from "../services/communities.service"
import type { CommunityMembership, CreateCommunityInput } from "../types"

/**
 * The communities the signed-in administrator belongs to, plus the ability to start another one.
 *
 * `enabled` is false before there is a session: the list belongs to whoever is signed in, so asking
 * for it first would load the wrong answer.
 */
export function useCommunities(enabled = true) {
  const { data, status, error, retry } = useAsyncResource<CommunityMembership[]>(
    () => (enabled ? communitiesService.list() : Promise.resolve([])),
    [enabled],
  )
  const [pending, setPending] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  /**
   * Starts a community and hands the new membership back to the caller.
   *
   * The caller is what registers it: the active tenant lives in the workspace store, so the list this
   * hook read would not know about a community that did not exist when it was loaded.
   */
  const create = useCallback(async (input: CreateCommunityInput): Promise<CommunityMembership | null> => {
    setPending(true)
    setCreateError(null)
    try {
      return await communitiesService.create(input)
    } catch (reason) {
      setCreateError(getUserErrorMessage(reason))
      return null
    } finally {
      setPending(false)
    }
  }, [])

  return { communities: data ?? [], status, error, retry, create, pending, createError }
}
