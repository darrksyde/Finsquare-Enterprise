import { describe, expect, it, vi } from "vitest"
import { buildDuesDataset } from "../mocks/dues.mock"
import { createMockDuesRepository } from "./mock-dues.repository"
describe("mock dues repository", () => {
  it("returns a dataset scoped to the requested organization", async () => {
    const repository = createMockDuesRepository(buildDuesDataset({ today: "2026-06-01" }))
    const dataset = await repository.load("org-lagos-farmers")
    expect(dataset.plans.length).toBeGreaterThan(0)
    expect(dataset.charges.length).toBeGreaterThan(0)
    expect(dataset.transactions.length).toBeGreaterThan(0)
    expect(dataset.charges.every((row) => row.organizationId === "org-lagos-farmers")).toBe(true)
  })
  it("returns nothing for another organization", async () => {
    const repository = createMockDuesRepository()
    const dataset = await repository.load("org-somebody-else")
    expect(dataset.plans).toEqual([])
    expect(dataset.participants).toEqual([])
    expect(dataset.charges).toEqual([])
    expect(dataset.transactions).toEqual([])
  })
  it("merges committed collections and notifies subscribers", async () => {
    const repository = createMockDuesRepository()
    const listener = vi.fn()
    const unsubscribe = repository.subscribe(listener)
    const before = await repository.load("org-lagos-farmers")
    await repository.commit("org-lagos-farmers", {
      charges: before.charges.slice(0, 2),
    })
    expect(listener).toHaveBeenCalledTimes(1)
    const after = await repository.load("org-lagos-farmers")
    expect(after.charges).toHaveLength(2)
    // Collections that were not part of the commit are preserved.
    expect(after.plans).toHaveLength(before.plans.length)
    unsubscribe()
    await repository.commit("org-lagos-farmers", { charges: [] })
    expect(listener).toHaveBeenCalledTimes(1)
  })
  it("keeps instances isolated so tests do not leak state", async () => {
    const first = createMockDuesRepository()
    const second = createMockDuesRepository()
    await first.commit("org-lagos-farmers", { charges: [] })
    const [a, b] = await Promise.all([first.load("org-lagos-farmers"), second.load("org-lagos-farmers")])
    expect(a.charges).toHaveLength(0)
    expect(b.charges.length).toBeGreaterThan(0)
  })
})
