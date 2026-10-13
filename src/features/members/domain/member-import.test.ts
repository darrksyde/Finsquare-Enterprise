import { describe, expect, it } from "vitest"
import { DO_NOT_IMPORT, defaultMapping, formatJoinedDate, parseCsv, summariseImport } from "./member-import"

describe("parseCsv", () => {
  it("reads a header row and its records", () => {
    const table = parseCsv("Full Name,Phone\nAmina Yusuf,08000000000\nChidi Obi,08000000001")
    expect(table.headers).toEqual(["Full Name", "Phone"])
    expect(table.rows).toEqual([
      ["Amina Yusuf", "08000000000"],
      ["Chidi Obi", "08000000001"],
    ])
  })

  it("keeps commas that sit inside quoted values", () => {
    const table = parseCsv('Name,Address\n"Amina Yusuf","12 Market Road, Ikeja"')
    expect(table.rows[0]).toEqual(["Amina Yusuf", "12 Market Road, Ikeja"])
  })

  it("unescapes doubled quotes", () => {
    const table = parseCsv('Name,Nickname\n"Amina ""Ami"" Yusuf",Ami')
    expect(table.rows[0][0]).toBe('Amina "Ami" Yusuf')
  })

  it("handles CRLF line endings and a trailing newline", () => {
    const table = parseCsv("Name,Phone\r\nAmina,08000000000\r\n")
    expect(table.headers).toEqual(["Name", "Phone"])
    expect(table.rows).toEqual([["Amina", "08000000000"]])
  })

  it("drops blank lines", () => {
    expect(parseCsv("Name\n\nAmina\n\n\nChidi\n").rows).toEqual([["Amina"], ["Chidi"]])
  })

  it("returns nothing for an empty document", () => {
    expect(parseCsv("")).toEqual({ headers: [], rows: [] })
  })

  it("trims surrounding whitespace from cells", () => {
    expect(parseCsv("Name , Phone \n Amina , 08000000000 ").rows[0]).toEqual(["Amina", "08000000000"])
  })
})

describe("defaultMapping", () => {
  it("matches common header spellings", () => {
    expect(defaultMapping(["Full Name", "Phone Number", "Email Address", "Date joined"])).toEqual([
      "Full name",
      "Phone",
      "Email",
      "Date joined",
    ])
  })

  it("leaves a column we do not store unmapped", () => {
    expect(defaultMapping(["Full Name", "Branch", "Favourite Colour"])).toEqual([
      "Full name",
      DO_NOT_IMPORT,
      DO_NOT_IMPORT,
    ])
  })

  it("never maps the same target to two columns", () => {
    expect(defaultMapping(["Phone", "Phone"])).toEqual(["Phone", DO_NOT_IMPORT])
  })
})

describe("summariseImport", () => {
  const table = parseCsv(
    ["Full Name,Phone,Branch", "Amina Yusuf,08000000000,Ikeja", ",08000000001,Ikeja", "Chidi Obi,,Ikeja"].join("\n"),
  )

  it("counts records that carry both a name and a phone number as ready", () => {
    const summary = summariseImport(table, ["Full name", "Phone", DO_NOT_IMPORT])
    expect(summary.ready).toBe(1)
    expect(summary.skipped).toBe(2)
    expect(summary.total).toBe(3)
  })

  it("treats everything as skipped when neither required column is mapped", () => {
    const summary = summariseImport(table, [DO_NOT_IMPORT, DO_NOT_IMPORT, DO_NOT_IMPORT])
    expect(summary.ready).toBe(0)
    expect(summary.skipped).toBe(3)
  })

  it("previews the first records of the file", () => {
    expect(summariseImport(table, ["Full name", "Phone", DO_NOT_IMPORT], 2).preview).toHaveLength(2)
  })
})

describe("formatJoinedDate", () => {
  const fallback = new Date("2026-10-13T00:00:00Z")

  it("writes the same display shape the register already uses", () => {
    expect(formatJoinedDate("2026-01-05", fallback)).toBe("05 Jan 2026")
  })

  it("falls back to today when the cell is empty or unreadable", () => {
    expect(formatJoinedDate("", fallback)).toBe("13 Oct 2026")
    expect(formatJoinedDate("not a date", fallback)).toBe("13 Oct 2026")
  })
})
