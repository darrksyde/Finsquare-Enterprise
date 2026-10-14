import { createTenantStore } from "@/lib/tenancy/tenant-store"
import { createMemberApplicationDataset } from "../mocks/member-applications.mock"
import type { MemberApplication, MemberApplicationDataset, MemberApplicationForm } from "../types/member-application.types"
import type { MemberApplicationRepository } from "./member-applications.repository"

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list]
}

const emptyDataset = (): MemberApplicationDataset => ({ forms: [], applications: [] })

/**
 * One dataset per community: the seeded community has the seeded forms and applications, and every
 * other community starts with none, so an application submitted through one community's link can
 * never appear in another's.
 */
export function createMockMemberApplicationRepository(): MemberApplicationRepository {
  const stores = createTenantStore<MemberApplicationDataset>({
    seed: () => createMemberApplicationDataset(),
    empty: emptyDataset,
  })
  const listeners = new Set<() => void>()
  const wait = () => new Promise((resolve) => setTimeout(resolve, 120))

  return {
    async load(organizationId: string): Promise<MemberApplicationDataset> {
      await wait()
      return structuredClone(stores.of(organizationId))
    },
    saveForm: (organizationId: string, form: MemberApplicationForm) => {
      const data = stores.of(organizationId)
      stores.set(organizationId, { ...data, forms: upsert(data.forms, form) })
      listeners.forEach((listener) => listener())
      return Promise.resolve()
    },
    saveApplication: (organizationId: string, application: MemberApplication) => {
      const data = stores.of(organizationId)
      stores.set(organizationId, { ...data, applications: upsert(data.applications, application) })
      listeners.forEach((listener) => listener())
      return Promise.resolve()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
  }
}
