import { apiClient, endpoints } from "@/services/api"
import type { ContributionDataset } from "../types/contribution.types"
import type { ContributionRepository } from "./contribution.repository"

/**
 * API-backed repository.
 *
 * `load` maps to a single read; `commit` posts a transactional batch so the frontend can keep
 * the same repository shape while the mock is in place. When the backend lands, prefer named
 * command endpoints (create contribution, record payment, request/approve payout) over the
 * batch — the service documents the exact command each mutation represents. The backend must
 * recompute balances, commission and approval requirements, and write an audit record per command.
 */
export class ApiContributionRepository implements ContributionRepository {
  async load(organizationId: string): Promise<ContributionDataset> {
    return apiClient.get<ContributionDataset>(endpoints.contributions.list(organizationId))
  }

  async commit(organizationId: string, next: Partial<ContributionDataset>): Promise<void> {
    await apiClient.post(endpoints.contributions.commands(organizationId), next)
  }

  subscribe(): () => void {
    // A real implementation would subscribe to a websocket or poll for invalidation.
    return () => {}
  }
}
