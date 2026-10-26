import type { CommunityMembership } from "@/features/communities/types"

export interface SignInCredentials {
  email: string
  password: string
  /** Required when the staff member belongs to more than one institution. */
  communityId?: string
}

/** The signed-in identity shown in the shell. Not persisted — the session ends on reload. */
export interface Session {
  email: string
  name: string
  signedInAt: string
  /** When set, the staff member must pick a new password before entering the shell. */
  mustChangePassword?: boolean
}

/** Domain result of a sign-in: the session plus the access token the API client sends. */
export interface AuthResult {
  session: Session
  accessToken: string
  /** The institutions the backend linked to this account, used to seed the workspace switcher. */
  memberships: CommunityMembership[]
}

/** The repository-level result: either a completed sign-in or the institutions to choose between. */
export type AuthOutcome =
  | { status: "signed-in"; result: AuthResult }
  | { status: "needs-selection"; communities: CommunityMembership[] }

/** What `useAuth().signIn` reports to the login screen. */
export type LoginOutcome =
  | { needsSelection: false }
  | { needsSelection: true; communities: CommunityMembership[] }

