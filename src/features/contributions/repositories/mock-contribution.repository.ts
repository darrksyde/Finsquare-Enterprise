import { buildContributionDataset } from "../mocks/contributions.mock"
import type { ContributionDataset } from "../types/contribution.types"
import type { ContributionRepository } from "./contribution.repository"

/**
 * In-memory repository. Stands in for the backend during frontend development and keeps the
 * same shape a real API would return, so swapping in `ApiContributionRepository` is the only
 * change needed to go live.
 */
export class MockContributionRepository implements ContributionRepository {
  private dataset: ContributionDataset
  private listeners = new Set<() => void>()

  constructor(initial?: ContributionDataset) {
    this.dataset = initial ?? buildContributionDataset()
  }

  async load(organizationId: string): Promise<ContributionDataset> {
    return this.scopeTo(organizationId)
  }

  async commit(organizationId: string, next: Partial<ContributionDataset>): Promise<void> {
    this.dataset = { ...this.dataset, ...next }
    void organizationId
    this.listeners.forEach((listener) => listener())
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private scopeTo(organizationId: string): ContributionDataset {
    const belongs = <T extends { organizationId: string }>(row: T) => row.organizationId === organizationId
    return {
      contributions: this.dataset.contributions.filter(belongs),
      participants: this.dataset.participants.filter(belongs),
      transactions: this.dataset.transactions.filter(belongs),
      withdrawals: this.dataset.withdrawals.filter(belongs),
      periods: this.dataset.periods.filter(belongs),
    }
  }
}

export function createMockContributionRepository(initial?: ContributionDataset): MockContributionRepository {
  return new MockContributionRepository(initial)
}
