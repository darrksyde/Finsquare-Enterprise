import { configureApiAuth } from "@/services/api"
import { env } from "@/app/config/env"
import { ApiAuthRepository } from "../repositories/api-auth.repository"
import { MockAuthRepository } from "../repositories/mock-auth.repository"
import type { AuthRepository } from "../repositories/auth.repository"
import type { AuthOutcome, SignInCredentials, SignUpInput } from "../types"

const repository: AuthRepository = env.VITE_ENABLE_MOCKS ? new MockAuthRepository() : new ApiAuthRepository()

// The access token lives for the session only; `apiClient` reads it through this provider.
let accessToken: string | null = null
configureApiAuth(() => accessToken)

export const authService = {
  async signIn(credentials: SignInCredentials): Promise<AuthOutcome> {
    const outcome = await repository.signIn(credentials)
    if (outcome.status === "signed-in") {
      accessToken = outcome.result.accessToken
    }
    return outcome
  },

  async signUp(input: SignUpInput): Promise<AuthOutcome> {
    const outcome = await repository.signUp(input)
    if (outcome.status === "signed-in") {
      accessToken = outcome.result.accessToken
    }
    return outcome
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await repository.changePassword(currentPassword, newPassword)
  },

  async signOut(): Promise<void> {
    try {
      await repository.signOut()
    } finally {
      accessToken = null
    }
  },
}
