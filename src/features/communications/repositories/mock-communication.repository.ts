import { createTenantStore } from "@/lib/tenancy/tenant-store"
import { buildCommunicationDataset } from "../mocks/communications.mock"
import type { CommunicationDataset } from "../types/message.types"
import type { CommunicationRepository } from "./communication.repository"

/**
 * In-memory repository. Stands in for the backend during frontend development and keeps the same
 * shape a real API would return, so swapping in `ApiCommunicationRepository` is the only change
 * needed to go live.
 *
 * Each community has its own balance and history: one community's send can never spend another's
 * balance, and a new community starts with nothing until it tops up.
 */
export class MockCommunicationRepository implements CommunicationRepository {
  private stores: ReturnType<typeof createTenantStore<CommunicationDataset>>
  private listeners = new Set<() => void>()

  /** `initial` replaces the seeded community's dataset; it exists so tests can set a balance. */
  constructor(initial?: CommunicationDataset) {
    this.stores = createTenantStore<CommunicationDataset>({
      seed: () => structuredClone(initial ?? buildCommunicationDataset()),
      empty: () => {
        const seeded = initial ?? buildCommunicationDataset()
        return {
          account: { ...seeded.account, balance: 0 },
          messages: [],
          topUps: [],
        }
      },
    })
  }

  async load(organizationId: string): Promise<CommunicationDataset> {
    return this.scopeTo(organizationId)
  }

  async commit(organizationId: string, next: Partial<CommunicationDataset>): Promise<void> {
    this.stores.set(organizationId, { ...this.stores.of(organizationId), ...next })
    this.listeners.forEach((listener) => listener())
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private scopeTo(organizationId: string): CommunicationDataset {
    const belongs = <T extends { organizationId: string }>(row: T) => row.organizationId === organizationId
    const dataset = this.stores.of(organizationId)
    return {
      account: dataset.account.organizationId === organizationId ? { ...dataset.account } : { ...dataset.account, organizationId, balance: 0 },
      messages: dataset.messages.filter(belongs),
      topUps: dataset.topUps.filter(belongs),
    }
  }
}

export function createMockCommunicationRepository(initial?: CommunicationDataset): MockCommunicationRepository {
  return new MockCommunicationRepository(initial)
}
