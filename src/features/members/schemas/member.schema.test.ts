import { describe, expect, it } from "vitest"
import { memberSchema } from "./member.schema"

describe("member schema", () => {
  it("accepts a valid member input", () => {
    expect(
      memberSchema.safeParse({
        name: "Adewale Johnson",
        phone: "+2348032147780",
        email: "adewale@example.demo",
        branchId: "ikeja",
        groupIds: ["maize"],
      }).success,
    ).toBe(true)
  })

  it("rejects incomplete identity and organization placement", () => {
    const result = memberSchema.safeParse({
      name: "A",
      phone: "123",
      groupIds: [],
    })
    expect(result.success).toBe(false)
  })
})
