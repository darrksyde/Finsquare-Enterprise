import type { DuesDataset } from "../types/dues.types"
/**
 * Persistence boundary for the dues domain.
 *
 * `organizationId` is the tenant context and is the first argument on every method, matching the
 * rest of the codebase. The backend must re-derive charge states, liens, outstanding amounts and
 * every dashboard figure — this interface exists so the UI never depends on how they are stored.
 */
export interface DuesRepository {
  load(organizationId: string): Promise<DuesDataset>
  /** Replaces named collections atomically; the backend equivalent is a transactional command. */
  commit(organizationId: string, next: Partial<DuesDataset>): Promise<void>
  subscribe(listener: () => void): () => void
}
