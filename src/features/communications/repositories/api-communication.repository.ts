import { apiClient, endpoints } from "@/services/api"
import type { CommunicationDataset } from "../types/message.types"
import type { CommunicationRepository } from "./communication.repository"

/**
 * API-backed repository.
 *
 * `load` maps to a single read; `commit` posts a transactional batch so the frontend can keep the
 * same repository shape while the mock is in place. When the backend lands, prefer named command
 * endpoints (send message, top up balance) over the batch — the service documents the exact
 * command each mutation represents. **The backend must own the SMS balance**: it re-checks the
 * price, recomputes the cost, refuses an unaffordable send and deducts the balance in the same
 * transaction that records the message.
 */
export class ApiCommunicationRepository implements CommunicationRepository {
  async load(organizationId: string): Promise<CommunicationDataset> {
    return apiClient.get<CommunicationDataset>(endpoints.communications.workspace(organizationId))
  }

  async commit(organizationId: string, next: Partial<CommunicationDataset>): Promise<void> {
    await apiClient.post(endpoints.communications.commands(organizationId), next)
  }

  subscribe(): () => void {
    // A real implementation would subscribe to a websocket or poll for invalidation.
    return () => {}
  }
}
