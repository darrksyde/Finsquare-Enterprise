import { apiClient, endpoints } from "@/services/api"
import type { QuestionLibraryItem } from "../types/form.types"
import type { QuestionLibraryRepository } from "./question-library.repository"

/**
 * API-backed repository. Saving a library question is a write against the shared organizational
 * library, so the backend owns id allocation, category validation and the audit record.
 */
export class ApiQuestionLibraryRepository implements QuestionLibraryRepository {
  async getAll(organizationId: string): Promise<QuestionLibraryItem[]> {
    const response = await apiClient.get<{ items: QuestionLibraryItem[] }>(
      endpoints.forms.questionLibrary(organizationId),
    )
    return response.items
  }

  async save(organizationId: string, question: QuestionLibraryItem): Promise<QuestionLibraryItem> {
    return apiClient.post<QuestionLibraryItem>(
      endpoints.forms.questionLibrary(organizationId),
      question,
    )
  }

  subscribe(): () => void {
    // A real implementation would subscribe to a websocket or poll for invalidation.
    return () => {}
  }
}
