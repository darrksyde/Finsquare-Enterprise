import type { AuthResult, SignInCredentials } from "../types"

/**
 * Authentication boundary.
 *
 * There is no `organizationId` argument: sign-in happens before a tenant is known. The backend must
 * verify the credentials, issue the access token and return the identity — the frontend never
 * decides who someone is.
 */
export interface AuthRepository {
  signIn(credentials: SignInCredentials): Promise<AuthResult>
  signOut(): Promise<void>
}
