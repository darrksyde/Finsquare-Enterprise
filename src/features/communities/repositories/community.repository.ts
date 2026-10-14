import type { CommunityMembership, CreateCommunityInput } from "../types"

/**
 * The communities an administrator belongs to, and the ability to start a new one.
 *
 * Neither method takes a user id: the backend takes the person from the authenticated session, and a
 * client-supplied identity would be a way to ask for someone else's communities. Creating one makes
 * the caller its owner, so the same rule applies.
 */
export interface CommunityRepository {
  list(): Promise<CommunityMembership[]>
  create(input: CreateCommunityInput): Promise<CommunityMembership>
}
