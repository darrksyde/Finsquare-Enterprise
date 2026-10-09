import { createMemberApplicationDataset } from "../mocks/member-applications.mock"
import type { MemberApplication, MemberApplicationDataset, MemberApplicationForm } from "../types/member-application.types"
import type { MemberApplicationRepository } from "./member-applications.repository"

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list]
}

export function createMockMemberApplicationRepository(): MemberApplicationRepository {
  let data: MemberApplicationDataset = createMemberApplicationDataset()
  const listeners = new Set<() => void>()
  const commit = async (next: Partial<MemberApplicationDataset>) => {
    data = { ...data, ...next }
    listeners.forEach((listener) => listener())
  }
  const wait = () => new Promise((resolve) => setTimeout(resolve, 120))

  return {
    async load(): Promise<MemberApplicationDataset> {
      await wait()
      return structuredClone(data)
    },
    saveForm: (_organizationId: string, form: MemberApplicationForm) => commit({ forms: upsert(data.forms, form) }),
    saveApplication: (_organizationId: string, application: MemberApplication) => commit({ applications: upsert(data.applications, application) }),
    subscribe(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
  }
}
