import { describe, expect, it } from "vitest"
import { changePasswordSchema, loginSchema } from "./auth.schema"
import { validate } from "@/lib/validation/zod"

describe("login schema", () => {
  it("accepts a work email and a password of at least 6 characters", () => {
    expect(validate(loginSchema, { email: "ada@coop.ng", password: "secret1" })).toEqual({})
  })

  it("accepts a password of exactly 6 characters", () => {
    expect(validate(loginSchema, { email: "ada@coop.ng", password: "secret" })).toEqual({})
  })

  it("rejects a malformed email", () => {
    expect(validate(loginSchema, { email: "ada", password: "secret1" }).email).toBeTruthy()
  })

  it("rejects a password shorter than 6 characters", () => {
    expect(validate(loginSchema, { email: "ada@coop.ng", password: "short" }).password).toBeTruthy()
  })

  it("trims the email before it is validated", () => {
    expect(loginSchema.parse({ email: "  ada@coop.ng  ", password: "secret1" }).email).toBe("ada@coop.ng")
  })
})

describe("change password schema", () => {
  const valid = {
    currentPassword: "TempPass123!",
    newPassword: "NewPass123!",
    confirmPassword: "NewPass123!",
  }

  it("accepts a strong, matching new password", () => {
    expect(validate(changePasswordSchema, valid)).toEqual({})
  })

  it("rejects a new password without a symbol", () => {
    expect(
      validate(changePasswordSchema, { ...valid, newPassword: "NewPass123", confirmPassword: "NewPass123" })
        .newPassword,
    ).toBeTruthy()
  })

  it("rejects mismatched confirmation", () => {
    expect(validate(changePasswordSchema, { ...valid, confirmPassword: "Different123!" }).confirmPassword).toBeTruthy()
  })
})
