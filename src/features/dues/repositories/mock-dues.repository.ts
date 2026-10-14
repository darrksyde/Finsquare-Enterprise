import { createTenantStore } from "@/lib/tenancy/tenant-store"
import { buildDuesDataset } from "../mocks/dues.mock"
import type { DuesDataset } from "../types/dues.types"
import type { DuesRepository } from "./dues.repository"

const emptyDataset = (): DuesDataset => ({
  plans: [],
  participants: [],
  charges: [],
  transactions: [],
})

/**
 * In-memory repository. Stands in for the backend during frontend development and keeps the
 * same shape a real API would return, so swapping in `ApiDuesRepository` is the only change
 * needed to go live.
 *
 * Each community has its own dataset: the seeded community starts with the seeded plans and every
 * other community starts empty, so a plan created in one community can never replace another's rows.
 */
export class MockDuesRepository implements DuesRepository {
  private stores: ReturnType<typeof createTenantStore<DuesDataset>>
  private listeners = new Set<() => void>()

  constructor(initial?: DuesDataset) {
    this.stores = createTenantStore<DuesDataset>({
      seed: () => initial ?? buildDuesDataset(),
      empty: emptyDataset,
    })
  }

  async load(organizationId: string): Promise<DuesDataset> {
    return this.scopeTo(organizationId)
  }

  async commit(organizationId: string, next: Partial<DuesDataset>): Promise<void> {
    this.stores.set(organizationId, { ...this.stores.of(organizationId), ...next })
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
    const dataset = this.stores.of(organizationId)
    return {
      plans: dataset.plans.filter(belongs),
      participants: dataset.participants.filter(belongs),
      charges: dataset.charges.filter(belongs),
      transactions: dataset.transactions.filter(belongs),
    }
  }
}

export function createMockDuesRepository(initial?: DuesDataset): MockDuesRepository {
  return new MockDuesRepository(initial)
}
