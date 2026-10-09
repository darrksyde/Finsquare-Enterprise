import { describe, expect, it } from "vitest"
import { buildContributionDataset } from "../mocks/contributions.mock"
import { contributionPerformance, contributorSummary, filterTransactions } from "./reporting"

const data = buildContributionDataset({ today: "2026-06-01", maxPeriods: 40 })
const idsFor = (form: "General" | "Personal") =>
  data.contributions.filter((c) => c.form === form).map((c) => c.id)

describe("filtering by contribution form", () => {
  it("reports only the plans that match the chosen form", () => {
    const personal = contributionPerformance(data, { form: "Personal" })
    expect(personal.map((row) => row.contributionId).sort()).toEqual(idsFor("Personal").sort())
    expect(personal.length).toBeGreaterThan(0)

    const general = contributionPerformance(data, { form: "General" })
    expect(general.map((row) => row.contributionId).sort()).toEqual(idsFor("General").sort())
    expect(general.length).toBeGreaterThan(0)
  })

  it("keeps a member summary inside the chosen form", () => {
    const personalIds = new Set(idsFor("Personal"))
    const rows = contributorSummary(data, { form: "Personal" })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => personalIds.has(row.participant.contributionId))).toBe(true)
  })

  it("drops movements that belong to the other form", () => {
    const personalIds = new Set(idsFor("Personal"))
    const generalIds = new Set(idsFor("General"))

    const personal = filterTransactions(data, { form: "Personal" })
    expect(personal.length).toBeGreaterThan(0)
    expect(personal.every((tx) => personalIds.has(tx.contributionId))).toBe(true)

    const general = filterTransactions(data, { form: "General" })
    expect(general.every((tx) => generalIds.has(tx.contributionId))).toBe(true)
  })

  it("narrows by contribution, type and participant as well", () => {
    const one = filterTransactions(data, { contributionId: "cont-ikeja-ajo" })
    expect(one.length).toBeGreaterThan(0)
    expect(one.every((tx) => tx.contributionId === "cont-ikeja-ajo")).toBe(true)

    const participant = data.participants.find((p) => p.contributionId === "cont-ikeja-ajo")!
    const theirs = filterTransactions(data, { participantId: participant.id })
    expect(theirs.every((tx) => tx.participantId === participant.id)).toBe(true)
  })
})
