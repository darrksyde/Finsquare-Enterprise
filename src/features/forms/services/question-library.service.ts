import { env } from "@/app/config/env"
import { ApiQuestionLibraryRepository } from "../repositories/api-question-library.repository"
import { createMockQuestionLibraryRepository } from "../repositories/mock-question-library.repository"
import type { QuestionLibraryRepository } from "../repositories/question-library.repository"
import { mockId } from "../domain/forms"
import type { QuestionLibraryItem } from "../types/form.types"

export type NewQuestion = Pick<QuestionLibraryItem, "label" | "type" | "category"> &
  Partial<Pick<QuestionLibraryItem, "description" | "required" | "options">>

/**
 * The shared question library. A question saved here can be added to any form — loan application
 * forms and member application forms alike — so the rules about ids, duplication and archiving
 * live in one place instead of in each builder's UI.
 */
export class QuestionLibraryService {
  constructor(private repository: QuestionLibraryRepository) {}

  list = (organizationId: string) => this.repository.getAll(organizationId)
  subscribe = (listener: () => void) => this.repository.subscribe(listener)

  async create(organizationId: string, draft: NewQuestion): Promise<QuestionLibraryItem> {
    const label = draft.label.trim()
    if (!label) throw new Error("Enter the question text.")
    return this.repository.save(organizationId, {
      id: mockId("ql"),
      label,
      type: draft.type,
      category: draft.category.trim() || "General",
      description: draft.description,
      required: draft.required ?? true,
      options: draft.options,
      createdAt: new Date().toISOString().slice(0, 10),
      archived: false,
    })
  }

  async save(organizationId: string, question: QuestionLibraryItem): Promise<QuestionLibraryItem> {
    const label = question.label.trim()
    if (!label) throw new Error("Enter the question text.")
    return this.repository.save(organizationId, { ...question, label })
  }

  async duplicate(organizationId: string, question: QuestionLibraryItem): Promise<QuestionLibraryItem> {
    return this.repository.save(organizationId, {
      ...question,
      id: mockId("ql"),
      label: `${question.label} (copy)`,
      createdAt: new Date().toISOString().slice(0, 10),
    })
  }

  async archive(organizationId: string, question: QuestionLibraryItem): Promise<QuestionLibraryItem> {
    return this.repository.save(organizationId, { ...question, archived: true })
  }
}

const repository: QuestionLibraryRepository = env.VITE_ENABLE_MOCKS
  ? createMockQuestionLibraryRepository()
  : new ApiQuestionLibraryRepository()

export const questionLibraryService = new QuestionLibraryService(repository)
