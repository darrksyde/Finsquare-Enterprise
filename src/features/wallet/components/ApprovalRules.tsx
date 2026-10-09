import { useState } from "react"
import { Button, Field } from "@/components/ui"
import { ActionModal, NumField, PagedTable, Panel } from "@/features/loans/components/LoanUi"
import { WALLET_PERMISSIONS, type ApprovalKind, type ApprovalRule, type WalletPermission } from "../types/wallet.types"
import { ValueSelect, money, type WalletCtx } from "./WalletShell"

const KINDS: ApprovalKind[] = ["Disbursement"]
const blank = (): ApprovalRule => ({ id: `rule-${Date.now()}`, kind: "Disbursement", label: "", minAmount: 0, approvalsRequired: 1, approverPermission: "wallet.approve_disbursement", separationOfDuties: true })

export default function ApprovalRules({ ctx, canEdit }: { ctx: WalletCtx; canEdit: boolean }) {
  const [edit, setEdit] = useState<ApprovalRule | null>(null)
  const rules = ctx.data.rules.filter((r) => r.kind === "Disbursement")
  const save = async () => {
    if (!edit) return
    if (edit.label.trim().length < 2) throw new Error("Give the rule a label")
    if (edit.maxAmount !== undefined && edit.maxAmount <= edit.minAmount) throw new Error("Maximum must be above minimum")
    try { await ctx.service.saveRule(edit, ctx.actor); ctx.notify("Approval rule saved") } catch (e) { ctx.notify(e instanceof Error ? e.message : "Could not save"); throw e }
  }
  return (
    <Panel title="Loan disbursement approvals" subtitle="Who must approve a payout, by amount. The first rule whose range contains the amount applies. Approvals are enforced by the backend."
      actions={canEdit && <Button onClick={() => setEdit(blank())}>Add rule</Button>}>
      <PagedTable rows={rules} rowKey={(r) => r.id} onRowClick={canEdit ? (r) => setEdit({ ...r }) : undefined} emptyText="No approval rules — every amount is auto-approved."
        columns={[
          { id: "l", header: "Rule", render: (r) => <b>{r.label}</b> },
          { id: "k", header: "Applies to", render: (r) => r.kind },
          { id: "r", header: "Amount range", render: (r) => `${money(r.minAmount)} – ${r.maxAmount ? money(r.maxAmount) : "no limit"}` },
          { id: "n", header: "Approvals", render: (r) => (r.approvalsRequired === 0 ? "None" : r.approvalsRequired) },
          { id: "p", header: "Approver permission", render: (r) => WALLET_PERMISSIONS.find((p) => p.id === r.approverPermission)?.label ?? r.approverPermission },
          { id: "s", header: "Maker ≠ checker", render: (r) => (r.separationOfDuties ? "Yes" : "No") },
        ]} />
      {edit && (
        <ActionModal title={rules.some((r) => r.id === edit.id) ? "Edit rule" : "New approval rule"} submitLabel="Save rule" onClose={() => setEdit(null)} onSubmit={save}>
          <div className="form-grid">
            <Field label="Label" value={edit.label} onChange={(v) => setEdit({ ...edit, label: v })} />
            <ValueSelect label="Applies to" value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value as ApprovalKind, approverPermission: e.target.value === "Disbursement" ? "wallet.approve_disbursement" : "wallet.approve_transfer" })} options={KINDS.map((k) => ({ value: k, label: k }))} />
            <NumField label="Minimum amount (₦)" value={edit.minAmount} onChange={(v) => setEdit({ ...edit, minAmount: v })} />
            <NumField label="Maximum amount (₦, 0 = no limit)" value={edit.maxAmount ?? 0} onChange={(v) => setEdit({ ...edit, maxAmount: v || undefined })} />
            <NumField label="Approvals required" value={edit.approvalsRequired} onChange={(v) => setEdit({ ...edit, approvalsRequired: Math.max(0, Math.min(5, Math.round(v))) })} />
            <ValueSelect label="Approver permission" value={edit.approverPermission} onChange={(e) => setEdit({ ...edit, approverPermission: e.target.value as WalletPermission })} options={WALLET_PERMISSIONS.filter((p) => p.id.startsWith("wallet.approve")).map((p) => ({ value: p.id, label: p.label }))} />
          </div>
          <label style={{ display: "flex", gap: 8, marginTop: 10, fontSize: 13 }}>
            <input type="checkbox" checked={edit.separationOfDuties} onChange={(e) => setEdit({ ...edit, separationOfDuties: e.target.checked })} />
            The person who creates the request cannot approve it
          </label>
          {rules.some((r) => r.id === edit.id) && (
            <div style={{ marginTop: 10 }}><Button variant="danger" onClick={async () => { await ctx.service.removeRule(edit.id, ctx.actor); ctx.notify("Rule removed"); setEdit(null) }}>Remove rule</Button></div>
          )}
        </ActionModal>
      )}
    </Panel>
  )
}
