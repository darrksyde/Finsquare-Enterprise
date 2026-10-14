import { systemRoleById } from "@/lib/permissions/system-roles"
import { SEED_ORGANIZATION_ID } from "@/lib/tenancy/seed-tenant"
import type { CommunityMembership, CreateCommunityInput } from "../types"
import type { CommunityRepository } from "./community.repository"

const lagos = systemRoleById(SEED_ORGANIZATION_ID, "role-super-admin")!
const financeOfficer = systemRoleById(SEED_ORGANIZATION_ID, "role-finance")!

/**
 * The communities the signed-in administrator belongs to.
 *
 * The mock has no account store — any credentials that pass `loginSchema` are accepted — so it cannot
 * tell one person from another and answers for "whoever is signed in". The backend behind
 * `ApiCommunityRepository` answers from the session instead, which is why neither method takes a user
 * id.
 *
 * Two memberships are seeded on purpose: one community that has records in it, and one that does not,
 * so the switching and the role held in each are both visible without inventing data for the second.
 */
function seedMemberships(): CommunityMembership[] {
  return [
    {
      organizationId: SEED_ORGANIZATION_ID,
      name: "Lagos Farmers Cooperative",
      type: "Cooperative",
      logo: "",
      country: "Nigeria",
      legalName: "Lagos Farmers Cooperative Society Ltd",
      accent: "blue",
      roleId: lagos.id,
      roleName: lagos.name,
      scope: "organization",
      isOwner: true,
    },
    {
      organizationId: "org-greenfield-multipurpose",
      name: "Greenfield Multipurpose Cooperative",
      type: "Cooperative",
      logo: "",
      country: "Nigeria",
      legalName: "",
      accent: "blue",
      roleId: financeOfficer.id,
      roleName: financeOfficer.name,
      scope: "organization",
      isOwner: false,
    },
  ]
}

/** `Greenfield Multipurpose Cooperative` → `org-greenfield-multipurpose-cooperative`. */
function tenantIdFor(name: string, taken: CommunityMembership[]): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  const base = `org-${slug || "community"}`
  if (!taken.some((membership) => membership.organizationId === base)) return base
  // Two communities may legitimately share a name; the tenant id still has to be unique.
  let suffix = 2
  while (taken.some((membership) => membership.organizationId === `${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

export function createMockCommunityRepository(): CommunityRepository {
  let memberships = seedMemberships()

  return {
    async list() {
      return structuredClone(memberships)
    },

    /** Creating a community makes the caller its owner, so they hold its Super Admin role. */
    async create(input: CreateCommunityInput) {
      const membership: CommunityMembership = {
        organizationId: tenantIdFor(input.name, memberships),
        name: input.name,
        type: input.type,
        logo: input.logo,
        country: input.country,
        legalName: input.legalName,
        accent: input.accent,
        roleId: lagos.id,
        roleName: lagos.name,
        scope: "organization",
        isOwner: true,
      }
      memberships = [...memberships, membership]
      return structuredClone(membership)
    },
  }
}

/** The implementation the service uses; one list for the running app. */
export class MockCommunityRepository implements CommunityRepository {
  private inner = createMockCommunityRepository()

  list() {
    return this.inner.list()
  }

  create(input: CreateCommunityInput) {
    return this.inner.create(input)
  }
}
