import { apiClient, endpoints } from "@/services/api"
import { mapMfiMembership, type MfiRole } from "@/features/communities/domain/mfi-membership"
import type { AuthRepository } from "./auth.repository"
import type { AuthOutcome, AuthResult, Session, SignInCredentials } from "../types"

/** Backend response shape after the client unwraps `{ success, data }`. */
interface MfiLoginData {
  token: string
  mustChangePassword: boolean
  user: {
    email: string
    firstName?: string | null
    lastName?: string | null
    fullName?: string | null
    mfiRole: MfiRole
  }
  community: MfiCommunity | null
}

interface MfiCommunitySelectionData {
  requiresCommunitySelection: true
  availableCommunities: Array<{
    communityId: string
    name: string
    logo: string | null
    color?: string | null
    description: string | null
    mfiRole: MfiRole | null
  }>
}

interface MfiCommunity {
  id: string
  name: string
  logo?: string | null
  color?: string | null
  description?: string | null
  enabledFeatures?: string[]
}

function displayName(user: MfiLoginData["user"]): string {
  const combined = [user.firstName, user.lastName].filter(Boolean).join(" ")
  return user.fullName || combined || user.email
}

function mapAuthResult(data: MfiLoginData): AuthResult {
  const session: Session = {
    email: data.user.email,
    name: displayName(data.user),
    signedInAt: new Date().toISOString(),
    mustChangePassword: data.mustChangePassword,
  }
  const memberships = data.community ? [mapMfiMembership(data.community, data.user.mfiRole)] : []
  return { session, accessToken: data.token, memberships }
}

/**
 * API-backed repository, wired to the MFI backend.
 *
 * The backend verifies the credentials, issues the token and returns the staff member's identity and
 * institutions — either a completed sign-in or the list to choose between.
 */
export class ApiAuthRepository implements AuthRepository {
  async signIn(credentials: SignInCredentials): Promise<AuthOutcome> {
    const response = await apiClient.post<MfiLoginData | MfiCommunitySelectionData>(
      endpoints.auth.login,
      { email: credentials.email, password: credentials.password, communityId: credentials.communityId },
    )

    if ("requiresCommunitySelection" in response && response.requiresCommunitySelection) {
      return {
        status: "needs-selection",
        communities: response.availableCommunities.map((community) =>
          mapMfiMembership(
            { id: community.communityId, ...community },
            community.mfiRole ?? "SUPPORT",
          ),
        ),
      }
    }

    return { status: "signed-in", result: mapAuthResult(response as MfiLoginData) }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.patch(endpoints.auth.changePassword, { currentPassword, newPassword })
  }

  async signOut(): Promise<void> {
    // The backend issues stateless JWTs and has no logout endpoint; the token is cleared client-side.
  }
}

