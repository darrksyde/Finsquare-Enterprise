import { useMemo, useState } from "react"
import { Plus, Pencil } from "@/icons"
import { Button, Field, SelectField, Toggle } from "@/components/ui"
import { FilterBar, SearchInput } from "@/components/data-display/ManagementPrimitives"
import { FIELD_TYPES, hasOptions, libraryCategories, mockId, typeLabel } from "../domain/forms"
import { ActionModal, PagedTable, Panel, TextArea, fmtDate } from "@/features/loans/components/LoanUi"
import { OptionsEditor } from "./FormFieldEditor"
import type { QuestionLibraryItem } from "../types/form.types"

/**
 * What the library UI needs from whoever owns the library. Both the loan form builder and the
 * member application form builder pass the same shape, so the library itself stays shared.
 */
export interface QuestionLibraryApi {
  items: QuestionLibraryItem[]
  canEdit: boolean
  save: (question: QuestionLibraryItem) => Promise<QuestionLibraryItem>
  duplicate: (question: QuestionLibraryItem) => Promise<QuestionLibraryItem>
  archive: (question: QuestionLibraryItem) => Promise<QuestionLibraryItem>
  notify?: (message: string) => void
}

function useFilter(items: QuestionLibraryItem[]) {
  const [q, setQ] = useState("")
  const [cat, setCat] = useState("All categories")
  const rows = useMemo(() => items.filter((i) => !i.archived && (cat === "All categories" || i.category === cat) && `${i.label} ${i.category}`.toLowerCase().includes(q.toLowerCase())), [items, q, cat])
  const bar = (
    <FilterBar>
      <SearchInput value={q} onChange={setQ} placeholder="Search questions" />
      <div className="management-filters"><select value={cat} onChange={(e) => setCat(e.target.value)}><option>All categories</option>{libraryCategories(items).map((c) => <option key={c}>{c}</option>)}</select></div>
    </FilterBar>
  )
  return { rows, bar }
}

/** Searchable multi-select drawer used inside the form builder. */
export function LibraryPicker({ items, onAdd, onClose }: { items: QuestionLibraryItem[]; onAdd: (items: QuestionLibraryItem[]) => void; onClose: () => void }) {
  const { rows, bar } = useFilter(items)
  const [sel, setSel] = useState<string[]>([])
  return (
    <ActionModal wide title="Add from question library" onClose={onClose} submitLabel={`Add ${sel.length || ""} question${sel.length === 1 ? "" : "s"}`} disabled={!sel.length}
      onSubmit={() => onAdd(items.filter((i) => sel.includes(i.id)))}>
      {bar}
      <PagedTable rows={rows} rowKey={(r) => r.id} pageSize={6} selectedKeys={new Set(sel)} onSelectionChange={(k) => setSel([...k])}
        columns={[{ id: "l", header: "Question", render: (r) => <b>{r.label}</b> }, { id: "c", header: "Category", render: (r) => r.category }, { id: "t", header: "Type", render: (r) => typeLabel(r.type) }]} />
    </ActionModal>
  )
}

function QuestionModal({ initial, library, onClose }: { initial: QuestionLibraryItem | null; library: QuestionLibraryApi; onClose: () => void }) {
  const cats = libraryCategories(library.items)
  const [q, setQ] = useState<QuestionLibraryItem>(initial ?? { id: mockId("ql"), label: "", type: "short_text", category: cats[0] ?? "General", required: true, createdAt: new Date().toISOString().slice(0, 10), archived: false })
  return (
    <ActionModal title={initial ? "Edit saved question" : "New saved question"} onClose={onClose} submitLabel="Save question" disabled={!q.label.trim()}
      onSubmit={async () => { await library.save(q); library.notify?.("Question saved to library. Forms already using it keep their own copy.") }}>
      <div className="form-grid">
        <Field label="Question" value={q.label} onChange={(label) => setQ({ ...q, label })} />
        <SelectField label="Field type" value={typeLabel(q.type)} options={FIELD_TYPES.map((t) => t.label)} onChange={(l) => { const type = FIELD_TYPES.find((t) => t.label === l)!.id; setQ({ ...q, type, options: hasOptions(type) ? q.options ?? [{ id: mockId("o"), label: "Option 1" }] : undefined }) }} />
        <Field label="Category" value={q.category} onChange={(category) => setQ({ ...q, category })} />
        <div className="field"><span>Required by default</span><Toggle value={q.required} onChange={() => setQ({ ...q, required: !q.required })} /></div>
        <TextArea label="Description / helper text" value={q.description ?? ""} onChange={(description) => setQ({ ...q, description })} />
        {hasOptions(q.type) && <OptionsEditor options={q.options ?? []} onChange={(options) => setQ({ ...q, options })} />}
      </div>
    </ActionModal>
  )
}

export function QuestionLibraryManager({ library }: { library: QuestionLibraryApi }) {
  const { items, canEdit } = library
  const { rows, bar } = useFilter(items)
  const [edit, setEdit] = useState<QuestionLibraryItem | "new" | null>(null)
  return (
    <Panel title="Question library" subtitle="Saved questions can be added to any form. Each form gets its own copy."
      actions={canEdit && <Button icon={Plus} onClick={() => setEdit("new")}>New question</Button>}>
      {bar}
      <PagedTable rows={rows} rowKey={(r) => r.id} pageSize={8}
        columns={[
          { id: "l", header: "Question", render: (r) => <><b>{r.label}</b>{r.description && <div style={{ color: "var(--muted)" }}>{r.description}</div>}</> },
          { id: "c", header: "Category", render: (r) => r.category }, { id: "t", header: "Type", render: (r) => typeLabel(r.type) },
          { id: "r", header: "Required", render: (r) => (r.required ? "Yes" : "No") }, { id: "d", header: "Created", render: (r) => fmtDate(r.createdAt) },
          { id: "x", header: "", render: (r) => canEdit && (
            <span style={{ display: "flex", gap: 6 }}>
              <Button variant="ghost" icon={Pencil} onClick={() => setEdit(r)}>Edit</Button>
              <Button variant="ghost" onClick={async () => { await library.duplicate(r); library.notify?.("Question duplicated") }}>Duplicate</Button>
              <Button variant="ghost" onClick={async () => { await library.archive(r); library.notify?.("Question archived") }}>Archive</Button>
            </span>) },
        ]} />
      {edit && <QuestionModal initial={edit === "new" ? null : edit} library={library} onClose={() => setEdit(null)} />}
    </Panel>
  )
}
