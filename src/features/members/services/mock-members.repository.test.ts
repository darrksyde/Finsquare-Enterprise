import { describe, expect, it } from "vitest"
import { MockMemberRepository } from "./mock-members.repository"
import type { MemberRepository } from "./members.repository"

/** Typed as the interface so the test exercises the contract, not this implementation's shortcuts. */
const repository = (): MemberRepository => new MockMemberRepository()

/** Only what the repository reads from an upload, so the test does not depend on the File global. */
const csv = (text: string): File =>
  ({ name: "members.csv", size: text.length, text: async () => text }) as unknown as File

describe("MockMemberrepo.import", () => {
  it("creates a record for every row that has a name and a phone number", async () => {
    const repo = repository()
    const before = (await repo.getAll("org-1")).length
    const result = await repo.import(
      "org-1",
      csv("Full Name,Phone\nAmina Yusuf,08000000000\nChidi Obi,08000000001"),
    )

    expect(result.imported).toBe(2)
    expect(result.skipped).toBe(0)
    expect(result.errors).toEqual([])
    expect(await repo.getAll("org-1")).toHaveLength(before + 2)
  })

  it("skips a row missing a required field and reports the spreadsheet row number", async () => {
    const repo = repository()
    const result = await repo.import(
      "org-1",
      csv("Full Name,Phone\nAmina Yusuf,08000000000\n,08000000001\nChidi Obi,"),
    )

    expect(result.imported).toBe(1)
    expect(result.skipped).toBe(2)
    expect(result.errors).toEqual([
      { row: 3, message: "Full name is missing" },
      { row: 4, message: "Phone number is missing" },
    ])
  })

  it("reads the columns the caller maps", async () => {
    const repo = repository()
    const result = await repo.import(
      "org-1",
      csv("Phone,Full Name\n08000000000,Amina Yusuf"),
      ["Phone", "Full name"],
    )

    expect(result.imported).toBe(1)
    const created = (await repo.getAll("org-1")).find((member) => member.phone === "08000000000")
    expect(created?.name).toBe("Amina Yusuf")
  })

  it("gives every imported record its own id", async () => {
    const repo = repository()
    const result = await repo.import(
      "org-1",
      csv("Full Name,Phone\nAmina Yusuf,08000000000\nChidi Obi,08000000001"),
    )
    expect(result.imported).toBe(2)

    const members = await repo.getAll("org-1")
    const ids = members.map((member) => member.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("notifies open pages when records are added", async () => {
    const repo = repository()
    let notified = 0
    const unsubscribe = repo.subscribe(() => (notified += 1))

    await repo.import("org-1", csv("Full Name,Phone\nAmina Yusuf,08000000000"))
    expect(notified).toBe(1)

    unsubscribe()
    await repo.import("org-1", csv("Full Name,Phone\n,08000000001"))
    expect(notified).toBe(1)
  })
})

