import { apiClient, endpoints } from "@/services/api"
import type { AuthRepository } from "./auth.repository"
import type { AuthResult, Session, SignInCredentials } from "../types"

/** Backend response shape; mapped to the domain `AuthResult` here so DTOs never reach the UI. */
interface SignInResponse {
  access_token: string
  user: { email: string; name: string }
}

function mapAuthResult(response: SignInResponse): AuthResult {
  const session: Session = {
    email: response.user.email,
    name: response.user.name,
    signedInAt: new Date().toISOString(),
  }
  return { session, accessToken: response.access_token }
}

/**
 * API-backed repository. The backend must authenticate the credentials, issue the access token and
 * return the identity that the session is built from.
 */
export class ApiAuthRepository implements AuthRepository {
  async signIn(credentials: SignInCredentials): Promise<AuthResult> {
    const response = await apiClient.post<SignInResponse>(endpoints.auth.login, {
      email: credentials.email,
      password: credentials.password,
    })
    return mapAuthResult(response)
  }

  async signOut(): Promise<void> {
    await apiClient.post(endpoints.auth.logout)
  }
}
