import { Field, Toggle } from "@/components/ui"
import { NumField, TextArea } from "@/features/loans/components/LoanUi"
import { documentConfigOf } from "../domain/forms"
import type { DocumentRequirement as Doc, FormField } from "../types/form.types"

const TYPES = ["PDF", "JPG", "PNG", "DOCX", "XLSX"]

export function DocumentRequirementEditor({ field, onChange }: { field: FormField; onChange: (f: FormField) => void }) {
  const c = documentConfigOf(field)
  const set = (p: Partial<Doc>) => {
    const next = { ...c, ...p }
    onChange({ ...field, label: next.name, required: next.required, documentConfig: next })
  }
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Field label="Document name" value={c.name} onChange={(name) => set({ name })} />
      <TextArea label="Instructions for applicants" value={c.description ?? ""} onChange={(description) => set({ description })} placeholder="e.g. Utility bill from the last 3 months" />
      <div className="field"><span>Required</span><Toggle value={c.required} onChange={() => set({ required: !c.required })} /></div>
      <div className="field">
        <span>Allowed file types</span>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {TYPES.map((t) => (
            <label key={t} style={{ display: "flex", gap: 4, fontWeight: 400 }}>
              <input type="checkbox" checked={c.fileTypes.includes(t)} onChange={() => set({ fileTypes: c.fileTypes.includes(t) ? c.fileTypes.filter((x) => x !== t) : [...c.fileTypes, t] })} />{t}
            </label>
          ))}
        </div>
      </div>
      <NumField label="Maximum file size (MB)" value={c.maxSizeMb} onChange={(maxSizeMb) => set({ maxSizeMb })} />
    </div>
  )
}
