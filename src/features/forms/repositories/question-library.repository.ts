import type { QuestionLibraryItem } from "../types/form.types"

/** Contract for the shared question library. Swap the mock for an API-backed implementation later. */
export interface QuestionLibraryRepository {
  getAll(organizationId: string): Promise<QuestionLibraryItem[]>
  save(organizationId: string, question: QuestionLibraryItem): Promise<QuestionLibraryItem>
  subscribe(listener: () => void): () => void
}
