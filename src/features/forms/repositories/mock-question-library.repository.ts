import { createTenantStore } from "@/lib/tenancy/tenant-store"
import { createQuestionLibrary } from "../mocks/question-library.mock"
import type { QuestionLibraryItem } from "../types/form.types"
import type { QuestionLibraryRepository } from "./question-library.repository"

export function createMockQuestionLibraryRepository(): QuestionLibraryRepository {
  const stores = createTenantStore<QuestionLibraryItem[]>({
    seed: () => createQuestionLibrary(),
    // A new community starts with an empty library; the defaults are not another community's rows.
    empty: () => [],
  })
  const listeners = new Set<() => void>()
  const wait = () => new Promise((resolve) => setTimeout(resolve, 120))

  return {
    async getAll(organizationId: string): Promise<QuestionLibraryItem[]> {
      await wait()
      return structuredClone(stores.of(organizationId))
    },
    async save(organizationId: string, question: QuestionLibraryItem): Promise<QuestionLibraryItem> {
      const items = stores.of(organizationId)
      stores.set(
        organizationId,
        items.some((x) => x.id === question.id)
          ? items.map((x) => (x.id === question.id ? question : x))
          : [question, ...items],
      )
      listeners.forEach((listener) => listener())
      return structuredClone(question)
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
  }
}
