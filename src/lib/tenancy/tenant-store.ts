import { SEED_ORGANIZATION_ID } from "./seed-tenant"

export interface TenantStore<T> {
  /** The tenant's data, created empty the first time a community is asked about. */
  of(organizationId: string): T
  /** Replaces a tenant's whole entry; the mutating mock methods work in whole datasets. */
  set(organizationId: string, value: T): void
}

/**
 * Per-tenant in-memory storage for the mock repositories.
 *
 * The seeded community starts with its records, every other community starts empty, and a write from
 * one community can never touch another's data. Before this, a mock that ignored `organizationId`
 * answered every tenant with the same rows, and one that replaced a whole collection would wipe the
 * seeded community's records the first time a second community wrote anything.
 *
 * A real backend scopes by the authenticated session instead — which is why every repository method
 * takes the tenant as its first argument even when the mock used to ignore it.
 */
export function createTenantStore<T>({
  seed,
  empty,
}: {
  seed: () => T
  empty: () => T
}): TenantStore<T> {
  const entries = new Map<string, T>([[SEED_ORGANIZATION_ID, seed()]])
  return {
    of(organizationId) {
      let entry = entries.get(organizationId)
      if (!entry) {
        entry = empty()
        entries.set(organizationId, entry)
      }
      return entry
    },
    set(organizationId, value) {
      entries.set(organizationId, value)
    },
  }
}
