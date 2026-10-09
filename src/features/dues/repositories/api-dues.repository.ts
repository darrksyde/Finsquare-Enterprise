import { apiClient, endpoints } from "@/services/api"
import type { DuesDataset } from "../types/dues.types"
import type { DuesRepository } from "./dues.repository"
/**
 * API-backed repository.
 *
 * `load` maps to a single read; `commit` posts a transactional batch so the frontend can keep the
 * same repository shape while the mock is in place. When the backend lands, prefer named command
 * endpoints (create plan, record payment, run lien recovery) over the batch — the service documents
 * the exact command each mutation represents. The backend must recompute charge states, liens and
 * outstanding amounts, deduct the wallet atomically once per charge, and write an audit record per
 * command.
 */
export class ApiDuesRepository implements DuesRepository {
  async load(organizationId: string): Promise<DuesDataset> {
    return apiClient.get<DuesDataset>(endpoints.dues.list(organizationId))
  }
  async commit(organizationId: string, next: Partial<DuesDataset>): Promise<void> {
    await apiClient.post(endpoints.dues.commands(organizationId), next)
  }
  subscribe(): () => void {
    // A real implementation would subscribe to a websocket or poll for invalidation.
    return () => {}
  }
}
