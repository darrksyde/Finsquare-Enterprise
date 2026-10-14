import { describe, expect, it } from "vitest"
import { SEED_ORGANIZATION_ID } from "@/lib/tenancy/seed-tenant"
import { createMockCommunityRepository } from "./mock-community.repository"
import type { CreateCommunityInput } from "../types"

const input = (over: Partial<CreateCommunityInput> = {}): CreateCommunityInput => ({
  name: "Riverside Traders Association",
  type: "Association",
  legalName: "Riverside Traders Association Ltd",
  country: "Nigeria",
  logo: "",
  accent: "blue",
  ...over,
})

describe("mock community repository", () => {
  it("seeds the communities the administrator belongs to", async () => {
    const memberships = await createMockCommunityRepository().list()

    expect(memberships.map((membership) => membership.organizationId)).toEqual([
      SEED_ORGANIZATION_ID,
      "org-greenfield-multipurpose",
    ])
    expect(memberships[0].roleName).toBe("Super Admin")
    expect(memberships[1].roleName).toBe("Finance Officer")
    expect(memberships[0].isOwner).toBe(true)
    expect(memberships[1].isOwner).toBe(false)
  })

  it("gives the creator the Super Admin role of the community they create", async () => {
    const repository = createMockCommunityRepository()
    const created = await repository.create(input())

    expect(created.roleId).toBe("role-super-admin")
    expect(created.roleName).toBe("Super Admin")
    expect(created.isOwner).toBe(true)
    expect(created.scope).toBe("organization")
  })

  it("derives a tenant id from the name and keeps it unique", async () => {
    const repository = createMockCommunityRepository()
    const first = await repository.create(input())
    const second = await repository.create(input())

    expect(first.organizationId).toBe("org-riverside-traders-association")
    expect(second.organizationId).toBe("org-riverside-traders-association-2")
    expect((await repository.list()).map((membership) => membership.organizationId)).toContain(second.organizationId)
  })

  it("appends the created community to the list it returns", async () => {
    const repository = createMockCommunityRepository()
    const created = await repository.create(input())
    const memberships = await repository.list()

    expect(memberships).toHaveLength(3)
    expect(memberships[2].organizationId).toBe(created.organizationId)
  })

  it("does not leak one instance's community into another", async () => {
    const first = createMockCommunityRepository()
    const second = createMockCommunityRepository()
    await first.create(input())

    expect(await first.list()).toHaveLength(3)
    expect(await second.list()).toHaveLength(2)
  })

  it("returns copies, so a caller cannot mutate the stored memberships", async () => {
    const repository = createMockCommunityRepository()
    const memberships = await repository.list()
    memberships[0].name = "Renamed"

    expect((await repository.list())[0].name).toBe("Lagos Farmers Cooperative")
  })
})
