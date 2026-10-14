import { describe, expect, it } from "vitest"
import { SEED_ORGANIZATION_ID } from "./seed-tenant"
import { createTenantStore } from "./tenant-store"

describe("tenant store", () => {
  const store = () =>
    createTenantStore<{ rows: string[] }>({
      seed: () => ({ rows: ["seeded"] }),
      empty: () => ({ rows: [] }),
    })

  it("gives the seeded community its data and everyone else an empty entry", () => {
    const tenants = store()

    expect(tenants.of(SEED_ORGANIZATION_ID).rows).toEqual(["seeded"])
    expect(tenants.of("org-greenfield-multipurpose").rows).toEqual([])
  })

  it("keeps a write to one community out of another's data", () => {
    const tenants = store()
    tenants.of("org-greenfield-multipurpose").rows.push("mine")

    expect(tenants.of("org-greenfield-multipurpose").rows).toEqual(["mine"])
    expect(tenants.of(SEED_ORGANIZATION_ID).rows).toEqual(["seeded"])
    expect(tenants.of("org-a-third-one").rows).toEqual([])
  })

  it("replaces a community's entry without touching the others", () => {
    const tenants = store()
    tenants.set("org-greenfield-multipurpose", { rows: ["replaced"] })
    tenants.set(SEED_ORGANIZATION_ID, { rows: [] })

    expect(tenants.of("org-greenfield-multipurpose").rows).toEqual(["replaced"])
    expect(tenants.of(SEED_ORGANIZATION_ID).rows).toEqual([])
  })

  it("creates an entry once, so the caller keeps working with the same object", () => {
    const tenants = store()
    expect(tenants.of("org-greenfield-multipurpose")).toBe(tenants.of("org-greenfield-multipurpose"))
  })

  it("does not share the seed between two stores", () => {
    const first = store()
    const second = store()
    first.of(SEED_ORGANIZATION_ID).rows.push("added")

    expect(second.of(SEED_ORGANIZATION_ID).rows).toEqual(["seeded"])
  })
})
