import { useRef, useState, type DragEvent } from "react"
import { Badge, Button, IconButton, Modal, Stepper } from "@/components/ui"
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  ShieldCheck,
  Upload,
  X,
} from "@/icons"
import {
  DO_NOT_IMPORT,
  IMPORT_TARGET_FIELDS,
  defaultMapping,
  parseCsv,
  summariseImport,
  type CsvTable,
  type ImportTarget,
} from "../domain/member-import"
import { useImportMembers } from "../hooks/useImportMembers"
import { MEMBER_ORG_ID } from "../constants"
import type { MemberImportResult } from "@/types"

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

/**
 * Imports members from a CSV export. The file is read here only to preview and map it; the records
 * are created by the member repository, and every number shown afterwards comes back from it.
 */
export function ImportMembersModal({
  onClose,
  onComplete,
}: {
  onClose: () => void
  onComplete: (imported: number) => void
}) {
  const { run, busy, error: importError } = useImportMembers(MEMBER_ORG_ID)
  const [step, setStep] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [table, setTable] = useState<CsvTable | null>(null)
  const [mapping, setMapping] = useState<ImportTarget[]>([])
  const [problem, setProblem] = useState("")
  const [result, setResult] = useState<MemberImportResult | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const labels = ["Upload CSV", "Map fields", "Review", "Import"]

  const load = async (picked: File | undefined | null) => {
    if (!picked) return
    setProblem("")
    try {
      const parsed = parseCsv(await picked.text())
      if (!parsed.headers.length || !parsed.rows.length) {
        setFile(null)
        setTable(null)
        setProblem("That file has no records we can read. Export it from your spreadsheet as CSV, with a header row, and try again.")
        return
      }
      setFile(picked)
      setTable(parsed)
      setMapping(defaultMapping(parsed.headers))
    } catch {
      setFile(null)
      setTable(null)
      setProblem("That file could not be read. Export it from your spreadsheet as CSV and try again.")
    }
  }

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    void load(event.dataTransfer.files?.[0])
  }

  const clear = () => {
    setFile(null)
    setTable(null)
    setMapping([])
    setProblem("")
    setResult(null)
    if (input.current) input.current.value = ""
  }

  const summary = table ? summariseImport(table, mapping) : null
  const columns = table ? table.headers.slice(0, 4) : []
  const grid = { display: "grid", gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))` }
  const error = problem || importError || ""

  const submit = async () => {
    if (!file) return
    const outcome = await run(file, mapping)
    if (outcome) {
      setResult(outcome)
      setStep(3)
    }
  }

  return (
    <Modal title="Import members" onClose={onClose} wide>
      <Stepper steps={labels} active={step} />
      <div className="wizard-body">
        {step === 0 && (
          <>
            {file && summary ? (
              <div className="uploaded-file">
                <div className="file-icon">
                  <FileText size={22} />
                </div>
                <div>
                  <b>{file.name}</b>
                  <span>
                    {summary.total.toLocaleString()} {summary.total === 1 ? "record" : "records"} detected · {formatSize(file.size)}
                  </span>
                </div>
                <Badge tone="green">Ready</Badge>
                <IconButton icon={X} label="Remove file" onClick={clear} />
              </div>
            ) : (
              <div className="upload-zone" onDragOver={(event) => event.preventDefault()} onDrop={drop}>
                <Upload size={22} />
                <b>Drop your CSV here, or choose a file</b>
                <span>One row per member, with a header row. Nothing is imported until you confirm.</span>
                <Button variant="secondary" onClick={() => input.current?.click()}>Choose file</Button>
              </div>
            )}
            <input
              ref={input}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => void load(event.target.files?.[0])}
            />
            {error && <p className="form-error" role="alert">{error}</p>}
            {table && summary && (
              <div className="preview-table">
                <div className="mini-table-head" style={grid}>
                  {columns.map((header, index) => (
                    <span key={`${header}-${index}`}>{header}</span>
                  ))}
                </div>
                {summary.preview.map((row, rowIndex) => (
                  <div key={rowIndex} style={grid}>
                    {columns.map((_, columnIndex) => (
                      <span key={columnIndex}>{row[columnIndex] ?? ""}</span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {step === 1 && table && (
          <div className="mapping-list">
            <div className="mapping-head">
              <span>CSV column</span>
              <span />
              <span>Member field</span>
              <span />
            </div>
            {table.headers.map((header, index) => (
              <div key={`${header}-${index}`}>
                <span>{header}</span>
                <ArrowRight size={14} />
                <select
                  value={mapping[index] ?? DO_NOT_IMPORT}
                  aria-label={`Member field for ${header}`}
                  onChange={(event) =>
                    setMapping((current) =>
                      current.map((value, position) =>
                        position === index ? (event.target.value as ImportTarget) : value,
                      ),
                    )
                  }
                >
                  {IMPORT_TARGET_FIELDS.map((field) => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                  <option value={DO_NOT_IMPORT}>{DO_NOT_IMPORT}</option>
                </select>
                {mapping[index] && mapping[index] !== DO_NOT_IMPORT ? <CheckCircle2 size={16} /> : <span />}
              </div>
            ))}
          </div>
        )}
        {step === 2 && summary && (
          <>
            <div className="review-numbers">
              <div>
                <CheckCircle2 size={23} />
                <span>
                  <b>{summary.ready.toLocaleString()}</b>Ready to import
                </span>
              </div>
              <div>
                <Clock3 size={23} />
                <span>
                  <b>{summary.skipped.toLocaleString()}</b>Will be skipped
                </span>
              </div>
            </div>
            <div className="review-callout">
              <ShieldCheck size={18} />
              <span>
                A member needs a full name and a phone number. Rows missing either are skipped and
                listed with the reason afterwards, and members are created without needing a login.
              </span>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
          </>
        )}
        {step === 3 && result && (
          <div className="import-success">
            <div className="success-ring">
              <Check size={28} />
            </div>
            <div className="signup-title">
              {result.imported.toLocaleString()} {result.imported === 1 ? "member" : "members"} added
            </div>
            <p>
              Member records were added to your organization. Digital accounts were created without
              requiring login activation.
            </p>
            <div className="success-details">
              <span>{result.imported.toLocaleString()} imported</span>
              <span>{result.skipped.toLocaleString()} skipped</span>
              <span>{(result.imported + result.skipped).toLocaleString()} rows read</span>
            </div>
            {result.errors.length > 0 && (
              <div className="import-errors">
                {result.errors.slice(0, 5).map((failure) => (
                  <span key={failure.row}>Row {failure.row} — {failure.message}</span>
                ))}
                {result.errors.length > 5 && <span>…and {result.errors.length - 5} more</span>}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="wizard-footer">
        <Button variant="ghost" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < 2 && (
          <Button onClick={() => setStep(step + 1)} disabled={!table}>
            Continue <ArrowRight size={14} />
          </Button>
        )}
        {step === 2 && (
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? "Importing…" : "Import members"} <ArrowRight size={14} />
          </Button>
        )}
        {step === 3 && (
          <Button onClick={() => onComplete(result?.imported ?? 0)}>View members</Button>
        )}
      </div>
    </Modal>
  )
}
