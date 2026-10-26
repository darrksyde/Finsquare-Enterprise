import { createTenantStore } from "@/lib/tenancy/tenant-store"
import { SEED_ORGANIZATION_ID } from "@/lib/tenancy/seed-tenant"
import { createMemberApplicationDataset } from "../mocks/member-applications.mock"
import type { FormResponseValue } from "@/features/forms/types/form.types"
import type { MemberApplication, MemberApplicationDataset, MemberApplicationForm } from "../types/member-application.types"
import type { MemberApplicationRepository } from "./member-applications.repository"

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list]
}

const emptyDataset = (): MemberApplicationDataset => ({ forms: [], applications: [] })
const today = () => new Date().toISOString().slice(0, 10)

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
    async getPublicForm(slug: string): Promise<MemberApplicationForm | null> {
      await wait()
      const data = stores.of(SEED_ORGANIZATION_ID)
      return structuredClone(data.forms.find((form) => form.slug === slug) ?? null)
    },
    async submitPublic(slug: string, values: Record<string, FormResponseValue>): Promise<MemberApplication> {
      await wait()
      const data = stores.of(SEED_ORGANIZATION_ID)
      const form = data.forms.find((item) => item.slug === slug)
      if (!form) throw new Error("Application link not found.")
      const isOpen = form.joinMode === "Open"
      const application: MemberApplication = {
        id: `ma-${data.applications.length + 1}`,
        reference: `MA-${String(data.applications.length + 1).padStart(4, "0")}`,
        formId: form.id,
        formName: form.name,
        versionId: form.publishedVersionId ?? "",
        versionNumber: 1,
        submittedAt: today(),
        status: isOpen ? "Approved" : "Submitted",
        values,
        source: "Public link",
        ...(isOpen ? { memberId: `LFC-${data.applications.length + 1}` } : {}),
      }
      stores.set(SEED_ORGANIZATION_ID, {
        ...data,
        applications: [application, ...data.applications],
        forms: upsert(data.forms, { ...form, submissions: form.submissions + 1 }),
      })
      listeners.forEach((listener) => listener())
      return structuredClone(application)
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
  }
}

