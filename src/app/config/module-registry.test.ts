import { describe, expect, it } from "vitest"
import { getEnabledDependents, getMissingDependencies } from "./module-registry"

describe("module registry", () => {
  it("resolves missing dependencies", () => {
    expect(getMissingDependencies("loans", new Set(["members"]))).toEqual([
      "payments",
    ])
  })

  it("finds enabled dependent modules", () => {
    const dependents = getEnabledDependents(
      "members",
      new Set(["members", "payments", "loans"]),
    )
    expect(dependents.map((module) => module.id)).toEqual(["payments", "loans"])
  })
})
