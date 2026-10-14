import { useState } from "react"
import { Badge, Button } from "@/components/ui"
import { useOrganizationId } from "@/hooks/useOrganizationId"
import { loansServiceFor } from "@/features/loans"
import { ActionModal, PagedTable, Panel, TextArea, fmtDate } from "@/features/loans/components/LoanUi"
import { requiredApprovals } from "../domain/wallet.rules"
import type { ApprovalKind, WalletApproval } from "../types/wallet.types"
import { money, type WalletCtx } from "./WalletShell"

export default function ApprovalQueue({ ctx, kind }: { ctx: WalletCtx; kind: ApprovalKind }) {
  const organizationId = useOrganizationId()
  const [active, setActive] = useState<{ a: WalletApproval; decision: "approve" | "reject" } | null>(null)
  const [note, setNote] = useState("")
  const rows = ctx.data.approvals.filter((a) => a.kind === kind && ctx.wallets.some((w) => w.id === a.walletId))
  const perm = kind === "Disbursement" ? "wallet.approve_disbursement" : "wallet.approve_transfer"
  const why = (a: WalletApproval) => {
    const wallet = ctx.data.wallets.find((w) => w.id === a.walletId)!
    const rule = requiredApprovals(ctx.data.rules, a.kind, a.amount).rule
    if (!ctx.canOn(wallet, perm)) return "No approval permission"
    if (rule?.separationOfDuties && a.requestedById === ctx.actor.id) return "You requested this"
    if (a.approvals.some((x) => x.byId === ctx.actor.id)) return "You approved"
    return ""
  }
  return (
    <>
      <Panel title="Approval queue" subtitle="Requests waiting on, or completed by, approvers">
        <PagedTable rows={rows} rowKey={(a) => a.id} pageSize={6} emptyText={`No ${kind.toLowerCase()} approvals.`}
          columns={[
            { id: "r", header: "Reference", render: (a) => <b>{a.reference}</b> },
            { id: "w", header: "Wallet", render: (a) => ctx.data.wallets.find((w) => w.id === a.walletId)?.name },
            { id: "a", header: "Amount", render: (a) => money(a.amount) },
            { id: "b", header: "Requested by", render: (a) => <div>{a.requestedBy}<div style={{ color: "var(--muted)", fontSize: 12 }}>{fmtDate(a.requestedAt)}</div></div> },
            { id: "p", header: "Approvals", render: (a) => `${a.approvals.length}/${a.required}` },
            { id: "s", header: "Status", render: (a) => <Badge tone={a.status === "Approved" ? "green" : a.status === "Rejected" ? "red" : "amber"}>{a.status}</Badge> },
            { id: "x", header: "", render: (a) => a.status === "Pending" && (
              <div style={{ display: "flex", gap: 6 }}>
                <Button variant="secondary" disabled={!!why(a) || ctx.mode === "blocked"} onClick={() => { setNote(""); setActive({ a, decision: "approve" }) }}>{why(a) || "Approve"}</Button>
                {!why(a) && <Button variant="ghost" onClick={() => { setNote(""); setActive({ a, decision: "reject" }) }}>Reject</Button>}
              </div>
            ) },
          ]} />
      </Panel>
      {active && (
        <ActionModal title={`${active.decision === "approve" ? "Approve" : "Reject"} ${active.a.reference}`} danger={active.decision === "reject"} submitLabel={active.decision === "approve" ? "Approve" : "Reject"} onClose={() => setActive(null)}
          onSubmit={async () => {
            try {
              const r = await ctx.service.decide(active.a.id, active.decision, ctx.actor, note, ctx.mode)
              if (r.final && r.approved && active.a.kind === "Disbursement" && active.a.items) {
                await loansServiceFor(organizationId).disburse(active.a.items.map((i) => i.applicationId), "Bank transfer")
                ctx.notify("Approved — wallet debited and loans disbursed")
              } else ctx.notify(r.final ? (r.approved ? "Approved and completed" : "Request rejected") : "Approval recorded — more approvals are required")
            } catch (e) {
              ctx.notify(e instanceof Error ? e.message : "Could not record decision")
              throw e
            }
          }}>
          <p style={{ marginTop: 0 }}>{active.a.kind} of <b>{money(active.a.amount)}</b> from {ctx.data.wallets.find((w) => w.id === active.a.walletId)?.name}. {active.a.reason}</p>
          <TextArea label="Note (optional)" value={note} onChange={setNote} />
        </ActionModal>
      )}
    </>
  )
}
