import type { AuthOutcome, SignInCredentials } from "../types"

/**
 * Authentication boundary.
 *
 * There is no `organizationId` argument: sign-in happens before a tenant is known. The backend must
 * verify the credentials, issue the access token and return the identity — the frontend never
 * decides who someone is.
 */
export interface AuthRepository {
  signIn(credentials: SignInCredentials): Promise<AuthOutcome>
  signOut(): Promise<void>
  /** Sets a new password for the signed-in staff member; used by the forced-change gate. */
  changePassword(currentPassword: string, newPassword: string): Promise<void>
}
