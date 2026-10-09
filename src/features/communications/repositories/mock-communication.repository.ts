import { buildCommunicationDataset } from "../mocks/communications.mock"
import type { CommunicationDataset } from "../types/message.types"
import type { CommunicationRepository } from "./communication.repository"

/**
 * In-memory repository. Stands in for the backend during frontend development and keeps the same
 * shape a real API would return, so swapping in `ApiCommunicationRepository` is the only change
 * needed to go live.
 */
export class MockCommunicationRepository implements CommunicationRepository {
  private dataset: CommunicationDataset
  private listeners = new Set<() => void>()

  constructor(initial?: CommunicationDataset) {
    this.dataset = initial ?? buildCommunicationDataset()
  }

  async load(organizationId: string): Promise<CommunicationDataset> {
    return this.scopeTo(organizationId)
  }

  async commit(organizationId: string, next: Partial<CommunicationDataset>): Promise<void> {
    this.dataset = { ...this.dataset, ...next }
    void organizationId
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
    return {
      account: this.dataset.account.organizationId === organizationId ? { ...this.dataset.account } : { ...this.dataset.account, organizationId, balance: 0 },
      messages: this.dataset.messages.filter(belongs),
      topUps: this.dataset.topUps.filter(belongs),
    }
  }
}

export function createMockCommunicationRepository(initial?: CommunicationDataset): MockCommunicationRepository {
  return new MockCommunicationRepository(initial)
}
