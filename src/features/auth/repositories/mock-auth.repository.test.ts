import { describe, expect, it } from "vitest"
import { MockAuthRepository, nameFromEmail } from "./mock-auth.repository"

describe("mock auth repository", () => {
  it("returns a session and an access token for well-formed credentials", async () => {
    const outcome = await new MockAuthRepository().signIn({
      email: "ada.okoye@lagosfarmers.ng",
      password: "secret123",
    })
    expect(outcome.status).toBe("signed-in")
    if (outcome.status !== "signed-in") return
    expect(outcome.result.session.email).toBe("ada.okoye@lagosfarmers.ng")
    expect(outcome.result.session.name).toBe("Ada Okoye")
    expect(outcome.result.session.signedInAt).toBeTruthy()
    expect(outcome.result.accessToken).toBeTruthy()
  })

  it("trims the address it stores in the session", async () => {
    const outcome = await new MockAuthRepository().signIn({ email: "  ada@coop.ng  ", password: "secret123" })
    expect(outcome.status).toBe("signed-in")
    if (outcome.status !== "signed-in") return
    expect(outcome.result.session.email).toBe("ada@coop.ng")
  })

  it("falls back to the address when it has no readable name", async () => {
    const outcome = await new MockAuthRepository().signIn({ email: "123@coop.ng", password: "secret123" })
    expect(outcome.status).toBe("signed-in")
    if (outcome.status !== "signed-in") return
    expect(outcome.result.session.name).toBe("123")
  })

  it("changes password and signs out without error", async () => {
    await expect(new MockAuthRepository().changePassword()).resolves.toBeUndefined()
    await expect(new MockAuthRepository().signOut()).resolves.toBeUndefined()
  })

  it("builds a readable name from an address local part", () => {
    expect(nameFromEmail("john_doe-2@example.com")).toBe("John Doe 2")
  })
})
