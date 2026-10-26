import type { AuthRepository } from "./auth.repository"
import type { AuthOutcome, SignInCredentials, SignUpInput } from "../types"

/** `ada.okoye@example.com` → `Ada Okoye`, so a returning user still sees a sensible name. */
export function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? ""
  const words = local
    .split(/[._\-+]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
  return words.join(" ")
}

/**
 * Mock authentication.
 *
 * There is no account store yet, so any credentials that pass `loginSchema` are accepted and the
 * session is not persisted — reloading the page signs you out. The backend, behind
 * `ApiAuthRepository`, is the real boundary and must reject bad credentials.
 */
export class MockAuthRepository implements AuthRepository {
  async signIn({ email }: SignInCredentials): Promise<AuthOutcome> {
    const normalized = email.trim()
    return {
      status: "signed-in",
      result: {
        session: {
          email: normalized,
          name: nameFromEmail(normalized) || normalized,
          signedInAt: new Date().toISOString(),
        },
        accessToken: "mock-access-token",
        // The mock has no account store; the communities come from `useCommunities`, not from login.
        memberships: [],
      },
    }
  }

  async signUp(input: SignUpInput): Promise<AuthOutcome> {
    return {
      status: "signed-in",
      result: {
        session: {
          email: input.ownerEmail.trim(),
          name: input.ownerName.trim(),
          signedInAt: new Date().toISOString(),
        },
        accessToken: "mock-access-token",
        memberships: [],
      },
    }
  }

  async changePassword(): Promise<void> {
    // No account store to update; the forced-change gate never appears in mock mode.
  }

  async signOut(): Promise<void> {
    // Nothing to revoke in the mock; the placeholder token lives in the service only.
  }
}
