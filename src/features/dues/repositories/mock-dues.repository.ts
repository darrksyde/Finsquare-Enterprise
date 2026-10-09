import { buildDuesDataset } from "../mocks/dues.mock"
import type { DuesDataset } from "../types/dues.types"
import type { DuesRepository } from "./dues.repository"
/**
 * In-memory repository. Stands in for the backend during frontend development and keeps the
 * same shape a real API would return, so swapping in `ApiDuesRepository` is the only change
 * needed to go live.
 */
export class MockDuesRepository implements DuesRepository {
  private dataset: DuesDataset
  private listeners = new Set<() => void>()
  constructor(initial?: DuesDataset) {
    this.dataset = initial ?? buildDuesDataset()
  }
  async load(organizationId: string): Promise<DuesDataset> {
    return this.scopeTo(organizationId)
  }
  async commit(organizationId: string, next: Partial<DuesDataset>): Promise<void> {
    this.dataset = { ...this.dataset, ...next }
    void organizationId
    this.listeners.forEach((listener) => listener())
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  private scopeTo(organizationId: string): DuesDataset {
    const belongs = <
      T extends {
        organizationId: string
      },
    >(
      row: T,
    ) => row.organizationId === organizationId
    return {
      plans: this.dataset.plans.filter(belongs),
      participants: this.dataset.participants.filter(belongs),
      charges: this.dataset.charges.filter(belongs),
      transactions: this.dataset.transactions.filter(belongs),
    }
  }
}
export function createMockDuesRepository(initial?: DuesDataset): MockDuesRepository {
  return new MockDuesRepository(initial)
}
