export interface SignInCredentials {
  email: string
  password: string
}

/** The signed-in identity shown in the shell. Not persisted — the session ends on reload. */
export interface Session {
  email: string
  name: string
  signedInAt: string
}

/** Domain result of a sign-in: the session plus the access token the API client sends. */
export interface AuthResult {
  session: Session
  accessToken: string
}
