import { createTenantStore } from "@/lib/tenancy/tenant-store"
import { buildContributionDataset } from "../mocks/contributions.mock"
import type { ContributionDataset } from "../types/contribution.types"
import type { ContributionRepository } from "./contribution.repository"

const emptyDataset = (): ContributionDataset => ({
  contributions: [],
  participants: [],
  transactions: [],
  withdrawals: [],
  periods: [],
})

/**
 * In-memory repository. Stands in for the backend during frontend development and keeps the
 * same shape a real API would return, so swapping in `ApiContributionRepository` is the only
 * change needed to go live.
 *
 * Each community has its own dataset: the seeded community starts with the seeded plans and every
 * other community starts empty, so a plan created in one community can never replace another's rows.
 */
export class MockContributionRepository implements ContributionRepository {
  private stores: ReturnType<typeof createTenantStore<ContributionDataset>>
  private listeners = new Set<() => void>()

  constructor(initial?: ContributionDataset) {
    this.stores = createTenantStore<ContributionDataset>({
      seed: () => initial ?? buildContributionDataset(),
      empty: emptyDataset,
    })
  }

  async load(organizationId: string): Promise<ContributionDataset> {
    return this.scopeTo(organizationId)
  }

  async commit(organizationId: string, next: Partial<ContributionDataset>): Promise<void> {
    this.stores.set(organizationId, { ...this.stores.of(organizationId), ...next })
    this.listeners.forEach((listener) => listener())
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private scopeTo(organizationId: string): ContributionDataset {
    const belongs = <T extends { organizationId: string }>(row: T) => row.organizationId === organizationId
    const dataset = this.stores.of(organizationId)
    return {
      contributions: dataset.contributions.filter(belongs),
      participants: dataset.participants.filter(belongs),
      transactions: dataset.transactions.filter(belongs),
      withdrawals: dataset.withdrawals.filter(belongs),
      periods: dataset.periods.filter(belongs),
    }
  }
}

export function createMockContributionRepository(initial?: ContributionDataset): MockContributionRepository {
  return new MockContributionRepository(initial)
}
