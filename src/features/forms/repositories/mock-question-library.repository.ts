import { createQuestionLibrary } from "../mocks/question-library.mock"
import type { QuestionLibraryItem } from "../types/form.types"
import type { QuestionLibraryRepository } from "./question-library.repository"

export function createMockQuestionLibraryRepository(): QuestionLibraryRepository {
  let items = createQuestionLibrary()
  const listeners = new Set<() => void>()
  const wait = () => new Promise((resolve) => setTimeout(resolve, 120))

  return {
    async getAll(): Promise<QuestionLibraryItem[]> {
      await wait()
      return structuredClone(items)
    },
    async save(_organizationId: string, question: QuestionLibraryItem): Promise<QuestionLibraryItem> {
      items = items.some((x) => x.id === question.id)
        ? items.map((x) => (x.id === question.id ? question : x))
        : [question, ...items]
      listeners.forEach((listener) => listener())
      return structuredClone(question)
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
  }
}
