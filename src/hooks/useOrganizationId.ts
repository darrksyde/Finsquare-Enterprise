import { useWorkspace } from "@/app/providers/WorkspaceProvider"

/**
 * The tenant the current screen works in: the community that is active in the switcher.
 *
 * Every repository method takes this id as its first argument, and it is the join key for the data a
 * page loads — `useMembers(useOrganizationId())` reloads when the administrator switches community,
 * because the id is part of the hook's dependencies. It is never used as a security check: the
 * backend scopes by the authenticated session and re-authorises every request.
 */
export function useOrganizationId(): string {
  return useWorkspace().state.activeCommunityId
}

export default useOrganizationId
