import { describe, expect, it, vi } from "vitest"
import { buildCommunicationDataset } from "../mocks/communications.mock"
import { createMockCommunicationRepository } from "./mock-communication.repository"

describe("mock communication repository", () => {
  it("returns a dataset scoped to the requested organization", async () => {
    const repository = createMockCommunicationRepository(buildCommunicationDataset())
    const dataset = await repository.load("org-lagos-farmers")

    expect(dataset.messages.length).toBeGreaterThan(0)
    expect(dataset.messages.every((row) => row.organizationId === "org-lagos-farmers")).toBe(true)
    expect(dataset.topUps.every((row) => row.organizationId === "org-lagos-farmers")).toBe(true)
    expect(dataset.account.balance).toBeGreaterThan(0)
  })

  it("returns no messages and no balance for another organization", async () => {
    const repository = createMockCommunicationRepository()
    const dataset = await repository.load("org-somebody-else")

    expect(dataset.messages).toEqual([])
    expect(dataset.topUps).toEqual([])
    expect(dataset.account.balance).toBe(0)
  })

  it("merges committed collections and notifies subscribers", async () => {
    const repository = createMockCommunicationRepository()
    const listener = vi.fn()
    const unsubscribe = repository.subscribe(listener)

    const before = await repository.load("org-lagos-farmers")
    await repository.commit("org-lagos-farmers", { messages: before.messages.slice(0, 2) })

    expect(listener).toHaveBeenCalledTimes(1)
    const after = await repository.load("org-lagos-farmers")
    expect(after.messages).toHaveLength(2)

    unsubscribe()
    await repository.commit("org-lagos-farmers", { messages: [] })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("keeps the seeded history consistent with its own delivery outcomes", async () => {
    const dataset = await buildCommunicationDataset()
    for (const message of dataset.messages) {
      expect(message.deliveredCount + message.failedCount).toBe(message.recipientCount)
      expect(message.status === "Scheduled" || message.sentAt).toBeTruthy()
    }
    // The seed is what makes `Partially sent` and `Failed` reachable before anything is sent.
    const statuses = new Set(dataset.messages.map((message) => message.status))
    expect(statuses.has("Partially sent")).toBe(true)
    expect(statuses.has("Scheduled")).toBe(true)
  })
})
