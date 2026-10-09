import type { ContributionDataset } from "../types/contribution.types"

/**
 * Persistence boundary for the contributions domain.
 *
 * `organizationId` is the tenant context and is the first argument on every method, matching
 * the rest of the codebase. The backend must re-derive balances, commission and approvals —
 * this interface exists so the UI never depends on how they are stored.
 */
export interface ContributionRepository {
  load(organizationId: string): Promise<ContributionDataset>
  /** Replaces named collections atomically; the backend equivalent is a transactional command. */
  commit(organizationId: string, next: Partial<ContributionDataset>): Promise<void>
  subscribe(listener: () => void): () => void
}
