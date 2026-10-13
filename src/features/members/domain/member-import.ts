export interface CsvTable {
  headers: string[]
  rows: string[][]
}

/**
 * Reads a CSV document into a header row and its records.
 *
 * Handles the shape a cooperative actually exports: quoted values, `""` escapes inside them,
 * commas inside quotes, and CRLF or LF line endings. No dependency is needed for this much.
 */
export function parseCsv(text: string): CsvTable {
  const records: string[][] = []
  let record: string[] = []
  let field = ""
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
      continue
    }
    if (char === ",") {
      record.push(field)
      field = ""
      continue
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1
      record.push(field)
      records.push(record)
      record = []
      field = ""
      continue
    }
    field += char
  }

  if (field !== "" || record.length > 0) {
    record.push(field)
    records.push(record)
  }

  const cleaned = records
    .map((cells) => cells.map((cell) => cell.trim()))
    .filter((cells) => cells.some((cell) => cell !== ""))

  const [headers = [], ...rows] = cleaned
  return { headers, rows }
}

export const DO_NOT_IMPORT = "Do not import"

/** The member fields a spreadsheet column can be mapped onto. */
export const IMPORT_TARGET_FIELDS = [
  "Full name",
  "Phone",
  "Email",
  "Date joined",
] as const

export type ImportTarget = typeof IMPORT_TARGET_FIELDS[number] | typeof DO_NOT_IMPORT

const HEADER_ALIASES: readonly (readonly [typeof IMPORT_TARGET_FIELDS[number], RegExp])[] = [
  ["Full name", /^(full ?name|name|member ?name)$/i],
  ["Phone", /^(phone|phone ?number|mobile|telephone)$/i],
  ["Email", /^(e-?mail|e-?mail ?address)$/i],
  ["Date joined", /^(date ?joined|joined|join ?date|date ?of ?joining)$/i],
]

/** Suggests a target for each column from its header, never using the same target twice. */
export function defaultMapping(headers: string[]): ImportTarget[] {
  const taken = new Set<string>()
  return headers.map((header) => {
    const match = HEADER_ALIASES.find(([target, pattern]) => !taken.has(target) && pattern.test(header.trim()))
    if (!match) return DO_NOT_IMPORT
    taken.add(match[0])
    return match[0]
  })
}

export interface ImportSummary {
  /** Records that carry everything a member cannot exist without: a full name and a phone number. */
  ready: number
  /** Records that will be skipped, so the count is never left unexplained. */
  skipped: number
  total: number
  preview: string[][]
}

/**
 * Counts what an import would actually do. A record is ready when the columns mapped to full name
 * and phone number are both present and filled in; anything else is reported as skipped.
 */
export function summariseImport(table: CsvTable, mapping: ImportTarget[], previewSize = 3): ImportSummary {
  const nameIndex = mapping.indexOf("Full name")
  const phoneIndex = mapping.indexOf("Phone")
  const cell = (row: string[], index: number) => (index >= 0 ? (row[index] ?? "").trim() : "")
  const ready = table.rows.filter((row) => cell(row, nameIndex) !== "" && cell(row, phoneIndex) !== "")

  return {
    ready: ready.length,
    skipped: table.rows.length - ready.length,
    total: table.rows.length,
    preview: table.rows.slice(0, previewSize),
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** `joinedAt` is a display string in this register ("12 Jan 2023"), so an import writes the same. */
export function formatJoinedDate(value: string, fallback: Date): string {
  const trimmed = value.trim()
  const parsed = new Date(trimmed)
  const date = trimmed && !Number.isNaN(parsed.getTime()) ? parsed : fallback
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}
