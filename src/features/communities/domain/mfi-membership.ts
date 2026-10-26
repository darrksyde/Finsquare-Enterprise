import type { CommunityMembership } from "../types"

export type MfiRole = "OWNER" | "LOAN_OFFICER" | "SUPPORT"

/** The community fields the MFI backend returns on login and in `GET /communities`. */
export interface MfiCommunityIdentity {
  id: string
  name: string
  logo?: string | null
  color?: string | null
  description?: string | null
  enabledFeatures?: string[]
}

/**
 * The backend exposes MFI roles (`OWNER`, `LOAN_OFFICER`, `SUPPORT`); the workspace resolves system
 * roles like `role-super-admin`. LOAN_OFFICER and SUPPORT are approximations until an MFI-specific
 * role exists in the Enterprise catalog.
 */
export function roleForMfiRole(mfiRole: MfiRole): {
  roleId: string
  roleName: string
  isOwner: boolean
} {
  switch (mfiRole) {
    case "OWNER":
      return { roleId: "role-super-admin", roleName: "Super Admin", isOwner: true }
    case "LOAN_OFFICER":
      return { roleId: "role-finance", roleName: "Finance Officer", isOwner: false }
    case "SUPPORT":
      return { roleId: "role-auditor", roleName: "Auditor", isOwner: false }
  }
}

/** Maps an MFI community + the staff member's role onto the workspace membership domain model. */
export function mapMfiMembership(
  community: MfiCommunityIdentity,
  mfiRole: MfiRole,
): CommunityMembership {
  const role = roleForMfiRole(mfiRole)
  return {
    organizationId: community.id,
    name: community.name,
    // The MFI payload carries no organization type, country or legal name.
    type: "MFI",
    logo: community.logo ?? "",
    country: "",
    legalName: "",
    accent: community.color ?? "blue",
    roleId: role.roleId,
    roleName: role.roleName,
    scope: "organization",
    isOwner: role.isOwner,
  }
}
