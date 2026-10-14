import { useState } from "react"
import { Badge, Button } from "@/components/ui"
import { useAuthorization } from "@/features/administrators/hooks/useAuthorization"
import { useAdministrators } from "@/features/administrators/hooks/useAdministrators"
import { ActionModal, NumField, PagedTable, Panel, Tabs } from "@/features/loans/components/LoanUi"
import { WALLET_PERMISSIONS, type AccessSubject, type WalletAccess as Access, type WalletLimits, type WalletPermission } from "../types/wallet.types"
import ApprovalRules from "./ApprovalRules"
import { ValueSelect, fmtDateTime, money, type WalletCtx } from "./WalletShell"

type Tab = "access" | "limits" | "rules" | "audit"

function AccessEditor({ ctx, entry, onClose }: { ctx: WalletCtx; entry: Access; onClose: () => void }) {
  const [e, setE] = useState(entry)
  // The people and roles a grant can name belong to this community.
  const { roles } = useAuthorization()
  const { administrators } = useAdministrators(ctx.organizationId)
  const subjects = e.subjectType === "role" ? roles.map((r) => ({ id: r.id, name: r.name })) : administrators.map((a) => ({ id: a.id, name: a.name }))
  const toggle = (p: WalletPermission) => setE({ ...e, permissions: e.permissions.includes(p) ? e.permissions.filter((x) => x !== p) : [...e.permissions, p] })
  return (
    <ActionModal title={entry.subjectId ? "Edit access" : "Grant access"} submitLabel="Save access" onClose={onClose}
      disabled={!e.subjectId || !e.permissions.length}
      onSubmit={async () => { await ctx.service.saveAccess(e, ctx.actor); ctx.notify("Access saved") }}>
      <div className="form-grid">
        <ValueSelect label="Wallet" value={e.walletId} onChange={(ev) => setE({ ...e, walletId: ev.target.value })}
          options={[{ value: "*", label: "All wallets (organization-wide)" }, ...ctx.data.wallets.map((w) => ({ value: w.id, label: w.name }))]} />
        <ValueSelect label="Grant to" value={e.subjectType} onChange={(ev) => setE({ ...e, subjectType: ev.target.value as AccessSubject, subjectId: "", subjectName: "" })}
          options={[{ value: "user", label: "A person" }, { value: "role", label: "A role" }]} />
        <ValueSelect label={e.subjectType === "role" ? "Role" : "Administrator"} value={e.subjectId}
          onChange={(ev) => setE({ ...e, subjectId: ev.target.value, subjectName: subjects.find((s) => s.id === ev.target.value)?.name ?? "" })}
          options={[{ value: "", label: "Select…" }, ...subjects.map((s) => ({ value: s.id, label: s.name }))]} />
      </div>
      <div className="perm-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 12 }}>
        {WALLET_PERMISSIONS.map((p) => (
          <label key={p.id} style={{ display: "flex", gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={e.permissions.includes(p.id)} onChange={() => toggle(p.id)} />{p.label}
          </label>
        ))}
      </div>
      <p style={{ color: "var(--muted)", fontSize: 12 }}>Access applies only on top of the person's role. Having wallet.view in a role never exposes wallets that have no grant.</p>
    </ActionModal>
  )
}

function LimitsEditor({ ctx, canEdit }: { ctx: WalletCtx; canEdit: boolean }) {
  const [id, setId] = useState(ctx.wallets[0]?.id ?? "")
  const w = ctx.wallets.find((x) => x.id === id)
  const [limits, setLimits] = useState<WalletLimits | null>(null)
  const current = limits ?? w?.limits
  const fields: [keyof WalletLimits, string][] = [["singleTransaction", "Single transaction"], ["dailyTransfer", "Daily transfers"], ["dailyDisbursement", "Daily disbursements"], ["dailyFunding", "Daily funding"], ["dailyWithdrawal", "Daily withdrawals"]]
  return (
    <Panel title="Wallet limits" subtitle="Enforced on every outflow. Limits are re-checked by the backend." flush={false}>
      <ValueSelect label="Wallet" value={id} onChange={(e) => { setId(e.target.value); setLimits(null) }} options={ctx.wallets.map((x) => ({ value: x.id, label: x.name }))} />
      {w && current && (
        <>
          <div className="form-grid" style={{ marginTop: 12 }}>
            {fields.map(([k, label]) => <NumField key={k} label={`${label} (₦)`} value={current[k]} onChange={(v) => canEdit && setLimits({ ...current, [k]: Math.max(0, v) })} />)}
          </div>
          {canEdit && <div style={{ marginTop: 12 }}><Button disabled={!limits} onClick={async () => { await ctx.service.setLimits(w.id, limits!, ctx.actor); setLimits(null); ctx.notify("Limits updated") }}>Save limits</Button></div>}
          {!canEdit && <p style={{ color: "var(--muted)", fontSize: 12 }}>You can view limits but not change them.</p>}
        </>
      )}
    </Panel>
  )
}

export default function AccessControls({ ctx }: { ctx: WalletCtx }) {
  const [tab, setTab] = useState<Tab>("access")
  const [editing, setEditing] = useState<Access | null>(null)
  const canManage = ctx.can("wallet.manage_access")
  const wallets = ctx.data.wallets
  const visibleIds = new Set(ctx.wallets.map((w) => w.id))
  const access = ctx.data.access.filter((a) => a.walletId === "*" || visibleIds.has(a.walletId))
  const audit = ctx.data.audit.filter((a) => !a.walletId || visibleIds.has(a.walletId))
  return (
    <>
      <Tabs tabs={[{ id: "access", label: "Access", count: access.length }, { id: "limits", label: "Limits" }, { id: "rules", label: "Approval rules", count: ctx.data.rules.length }, { id: "audit", label: "Audit trail", count: audit.length }]} value={tab} onChange={setTab} />
      <div style={{ height: 12 }} />
      {tab === "access" && (
        <Panel title="Who can use which wallet" subtitle="Per-wallet grants. A branch admin sees only the wallets granted to them."
          actions={canManage && <Button onClick={() => setEditing({ id: `acc-${Date.now()}`, walletId: ctx.wallets[0]?.id ?? "*", subjectType: "user", subjectId: "", subjectName: "", permissions: ["wallet.view", "wallet.view_balance"] })}>Grant access</Button>}>
          <PagedTable rows={access} rowKey={(a) => a.id} onRowClick={canManage ? (a) => setEditing({ ...a }) : undefined} emptyText="No access grants."
            columns={[
              { id: "s", header: "Person / role", render: (a) => <b>{a.subjectName}</b> },
              { id: "t", header: "Type", render: (a) => (a.subjectType === "role" ? "Role" : "Person") },
              { id: "w", header: "Wallet", render: (a) => (a.walletId === "*" ? <Badge tone="blue">All wallets</Badge> : (wallets.find((w) => w.id === a.walletId)?.name ?? a.walletId)) },
              { id: "p", header: "Permissions", render: (a) => a.permissions.map((p) => WALLET_PERMISSIONS.find((x) => x.id === p)?.label ?? p).join(", ") },
            ]} />
        </Panel>
      )}
      {tab === "limits" && <LimitsEditor ctx={ctx} canEdit={ctx.can("wallet.manage_limits")} />}
      {tab === "rules" && <ApprovalRules ctx={ctx} canEdit={ctx.can("wallet.manage_limits")} />}
      {tab === "audit" && (
        <Panel title="Audit trail" subtitle="Append-only. Corrections are recorded as new entries.">
          <PagedTable rows={audit} rowKey={(a) => a.id} pageSize={12} emptyText="No audit entries."
            columns={[
              { id: "d", header: "When", render: (a) => fmtDateTime(a.at) },
              { id: "a", header: "Actor", render: (a) => a.actor },
              { id: "x", header: "Action", render: (a) => <b>{a.action}</b> },
              { id: "w", header: "Wallet", render: (a) => a.walletName ?? "—" },
              { id: "m", header: "Amount", render: (a) => (a.amount ? money(a.amount) : "—") },
              { id: "c", header: "Change", render: (a) => (a.previousState || a.newState ? `${a.previousState ?? "—"} → ${a.newState ?? "—"}` : "—") },
            ]} />
        </Panel>
      )}
      {editing && <AccessEditor ctx={ctx} entry={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
