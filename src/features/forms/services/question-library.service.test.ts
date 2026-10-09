import { describe, expect, it } from "vitest"
import { QuestionLibraryService } from "./question-library.service"
import { createMockQuestionLibraryRepository } from "../repositories/mock-question-library.repository"

const organizationId = "org-lagos-farmers"
const service = () => new QuestionLibraryService(createMockQuestionLibraryRepository())

describe("question library", () => {
  it("seeds a shared library covering several categories", async () => {
    const items = await service().list(organizationId)
    expect(items.length).toBeGreaterThan(10)
    expect(new Set(items.map((item) => item.category)).size).toBeGreaterThan(3)
    expect(items.find((item) => item.label === "Crop type")?.options?.map((o) => o.label)).toContain("Maize")
  })

  it("creates a question with a generated id, today's date and an unarchived state", async () => {
    const library = service()
    const created = await library.create(organizationId, { label: "Trading name", type: "short_text", category: "Business Information" })
    expect(created.id).toBeTruthy()
    expect(created.archived).toBe(false)
    expect(created.required).toBe(true)
    expect(created.createdAt).toBe(new Date().toISOString().slice(0, 10))
    expect((await library.list(organizationId)).some((item) => item.id === created.id)).toBe(true)
  })

  it("trims the label and refuses an empty one", async () => {
    const library = service()
    expect((await library.create(organizationId, { label: "  Trading name  ", type: "short_text", category: "General" })).label).toBe("Trading name")
    await expect(library.create(organizationId, { label: "   ", type: "short_text", category: "General" })).rejects.toThrow("Enter the question text.")
  })

  it("falls back to the General category when none is given", async () => {
    const created = await service().create(organizationId, { label: "Reference", type: "short_text", category: "" })
    expect(created.category).toBe("General")
  })

  it("duplicates with a new id so both copies can be used", async () => {
    const library = service()
    const [original] = await library.list(organizationId)
    const copy = await library.duplicate(organizationId, original)
    expect(copy.id).not.toBe(original.id)
    expect(copy.label).toBe(`${original.label} (copy)`)
    const items = await library.list(organizationId)
    expect(items.filter((item) => item.id === original.id || item.id === copy.id)).toHaveLength(2)
  })

  it("archiving keeps the question saved but out of the way", async () => {
    const library = service()
    const [original] = await library.list(organizationId)
    await library.archive(organizationId, original)
    expect((await library.list(organizationId)).find((item) => item.id === original.id)?.archived).toBe(true)
  })

  it("updating an existing question does not add a second copy", async () => {
    const library = service()
    const [original] = await library.list(organizationId)
    const before = (await library.list(organizationId)).length
    await library.save(organizationId, { ...original, label: "Business trading name" })
    const items = await library.list(organizationId)
    expect(items).toHaveLength(before)
    expect(items.find((item) => item.id === original.id)?.label).toBe("Business trading name")
  })

  it("notifies subscribers so every open builder refreshes", async () => {
    const library = service()
    let notified = 0
    const unsubscribe = library.subscribe(() => { notified += 1 })
    await library.create(organizationId, { label: "Reference", type: "short_text", category: "General" })
    expect(notified).toBe(1)
    unsubscribe()
    await library.create(organizationId, { label: "Second reference", type: "short_text", category: "General" })
    expect(notified).toBe(1)
  })

  it("hands every caller the same library", async () => {
    const library = service()
    await library.create(organizationId, { label: "Reference", type: "short_text", category: "General" })
    const first = await library.list(organizationId)
    const second = await library.list(organizationId)
    expect(second.map((item) => item.id)).toEqual(first.map((item) => item.id))
  })
})
