import { ApiError, apiClient, endpoints } from "@/services/api"
import { mapMfiMembership, type MfiRole } from "../domain/mfi-membership"
import type { CommunityMembership } from "../types"
import type { CommunityRepository } from "./community.repository"

/** `GET /communities` payload item, after the client unwraps `{ success, data }`. */
interface MfiCommunityDTO {
  communityId: string
  name: string
  logo: string | null
  color?: string | null
  description: string | null
  mfiRole: MfiRole
}

/**
 * API-backed repository, wired to the MFI backend's `GET /communities`.
 *
 * The backend resolves the institutions from the authenticated session. Creating an institution is
 * not exposed to staff — onboarding is a super-admin operation on the backend.
 */
export class ApiCommunityRepository implements CommunityRepository {
  async list(): Promise<CommunityMembership[]> {
    const response = await apiClient.get<MfiCommunityDTO[]>(endpoints.organizations.list)
    return response.map((community) =>
      mapMfiMembership(
        { id: community.communityId, ...community },
        community.mfiRole,
      ),
    )
  }

  async create(): Promise<CommunityMembership> {
    throw new ApiError(
      "Creating an institution is not available on the backend yet. Contact FinSquare to onboard a new institution.",
      "not_found",
    )
  }
}
