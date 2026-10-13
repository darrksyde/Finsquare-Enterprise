import { describe, expect, it } from "vitest"
import { loginSchema } from "./auth.schema"
import { validate } from "@/lib/validation/zod"

describe("login schema", () => {
  it("accepts a work email and a password of at least 8 characters", () => {
    expect(validate(loginSchema, { email: "ada@coop.ng", password: "secret123" })).toEqual({})
  })

  it("rejects a malformed email", () => {
    expect(validate(loginSchema, { email: "ada", password: "secret123" }).email).toBeTruthy()
  })

  it("rejects a password shorter than 8 characters", () => {
    expect(validate(loginSchema, { email: "ada@coop.ng", password: "short" }).password).toBeTruthy()
  })

  it("trims the email before it is validated", () => {
    expect(loginSchema.parse({ email: "  ada@coop.ng  ", password: "secret123" }).email).toBe("ada@coop.ng")
  })
})
