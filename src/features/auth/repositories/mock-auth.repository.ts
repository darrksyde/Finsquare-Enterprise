import type { AuthRepository } from "./auth.repository"
import type { AuthResult, SignInCredentials } from "../types"

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
  async signIn({ email }: SignInCredentials): Promise<AuthResult> {
    const normalized = email.trim()
    return {
      session: {
        email: normalized,
        name: nameFromEmail(normalized) || normalized,
        signedInAt: new Date().toISOString(),
      },
      accessToken: "mock-access-token",
    }
  }

  async signOut(): Promise<void> {
    // Nothing to revoke in the mock; the placeholder token lives in the service only.
  }
}
