import { useState } from "react"
import { SelectField, Toggle } from "@/components/ui"
import { ActionModal, KV, StatusBadge, TextArea, money, fmtDate, type LoanCtx } from "./LoanUi"
import type { GuarantorRequest, GuarantorStatus } from "../types/loan.types"

export function GuarantorVerifyModal({ req, ctx, onClose }: { req: GuarantorRequest; ctx: LoanCtx; onClose: () => void }) {
  const [status, setStatus] = useState<GuarantorStatus>(req.status)
  const [method, setMethod] = useState(req.verificationMethod ?? "Phone verification")
  const [notes, setNotes] = useState(req.notes)
  const [form, setForm] = useState(req.documents.length > 0)
  const g = req.guarantor
  const canVerify = ctx.can("guarantors.verify")
  const loans = ctx.data.guarantorRequests.filter((r) => r.guarantor.id === g.id && r.id !== req.id)
  return (
    <ActionModal wide title={`Guarantor – ${g.name}`} onClose={onClose} submitLabel="Save" disabled={!canVerify}
      onSubmit={async () => {
        await ctx.service.updateGuarantor(req, status, method as GuarantorRequest["verificationMethod"], notes, form)
        ctx.notify("Guarantor updated")
      }}>
      <KV cols={3} items={[
        ["Name", g.name], ["Contact", g.phone], ["Relationship", g.relationship], ["Type", g.type === "Member" ? `Member ${g.memberId}` : "External guarantor"],
        ["Guarantee amount", money(req.amount)], ["Current status", <StatusBadge key="s" status={req.status} />],
      ]} />
      {canVerify ? (
        <div className="form-grid" style={{ marginTop: 14 }}>
          <SelectField label="Status" value={status} options={["Pending", "Verified", "Accepted", "Rejected"]} onChange={(v) => setStatus(v as GuarantorStatus)} />
          <SelectField label="Verification method" value={method} options={["Phone verification", "Signed guarantee form", "Other"]} onChange={(v) => setMethod(v as typeof method)} />
          <div className="field"><span>Signed guarantee form uploaded</span><Toggle value={form} onChange={() => setForm(!form)} /></div>
          <TextArea label="Verification notes" value={notes} onChange={setNotes} placeholder="e.g. Called on 12 Oct, confirmed willingness to guarantee." />
        </div>
      ) : <div className="blocked-note"><span>You do not have permission to verify guarantors.</span></div>}
      <div className="form-section-title">Documents</div>
      {req.documents.length ? req.documents.map((d) => <div key={d.id}>{d.name} · {fmtDate(d.uploadedAt)}</div>) : <span style={{ color: "var(--muted)" }}>No documents uploaded</span>}
      <div className="form-section-title">Other guaranteed loans</div>
      {loans.length ? loans.map((r) => <div key={r.id}>{r.loanId ? ctx.data.loans.find((l) => l.id === r.loanId)?.reference : ctx.data.applications.find((a) => a.id === r.applicationId)?.reference} · {money(r.amount)} · {r.status}</div>) : <span style={{ color: "var(--muted)" }}>None</span>}
    </ActionModal>
  )
}
