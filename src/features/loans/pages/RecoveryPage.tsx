import { useState } from "react"
import { Button, SectionHeader } from "@/components/ui"
import { RecoveryModal } from "../components/RecoveryModal"
import { ActionModal, LoanPage, NumField, PagedTable, Panel, StatusBadge, Stats, Tabs, compactMoney, fmtDate, money, type LoanPageProps } from "../components/LoanUi"
import type { RecoverySettings } from "../types/loan.types"

export function RecoveryPage(props: LoanPageProps) {
  const [tab, setTab] = useState<"Overdue" | "Defaulted" | "Resolved">("Overdue")
  const [caseId, setCaseId] = useState<string | null>(null)
  const [settings, setSettings] = useState<RecoverySettings | null>(null)
  return (
    <LoanPage {...props}>
      {(ctx) => {
        const { data, can, service, notify, navigate } = ctx
        const loans = data.loans.filter((l) => ["Overdue", "Defaulted"].includes(l.status))
        const rows = tab === "Resolved" ? [] : loans.filter((l) => l.status === tab)
        const resolved = data.recoveryCases.filter((c) => c.status === "Resolved")
        const caseFor = (id: string) => data.recoveryCases.find((c) => c.loanId === id && c.status !== "Resolved")
        const last = (id: string) => data.repayments.find((r) => r.loanId === id)?.date
        const gOf = (id: string) => data.guarantorRequests.filter((g) => g.loanId === id).map((g) => g.guarantor.name).join(", ") || "—"
        return (
          <>
            <SectionHeader eyebrow="LOANS" title="Recovery & defaults" description="Overdue and defaulted loans enter recovery automatically; failed repayment attempts notify the borrower."
              actions={can("loans.recover") && <Button variant="secondary" onClick={() => setSettings({ ...data.settings })}>Default settings</Button>} />
            <Stats items={[
              { label: "Overdue loans", value: loans.filter((l) => l.status === "Overdue").length, tone: "amber" },
              { label: "Defaulted loans", value: loans.filter((l) => l.status === "Defaulted").length, tone: "red" },
              { label: "Amount overdue", value: compactMoney(loans.reduce((t, l) => t + l.overdueAmount, 0)) },
              { label: "Exposure", value: compactMoney(loans.reduce((t, l) => t + l.outstanding, 0)), detail: `Default after ${data.settings.defaultAfterDays} days overdue` },
            ]} />
            <Tabs value={tab} onChange={setTab} tabs={[{ id: "Overdue", label: "Overdue", count: loans.filter((l) => l.status === "Overdue").length }, { id: "Defaulted", label: "Defaulted", count: loans.filter((l) => l.status === "Defaulted").length }, { id: "Resolved", label: "Resolved cases", count: resolved.length }]} />
            <Panel>
              {tab === "Resolved" ? (
                <PagedTable rows={resolved} rowKey={(c) => c.id} emptyText="No resolved cases yet" onRowClick={(c) => navigate("loan-detail", c.loanId)}
                  columns={[{ id: "b", header: "Borrower", render: (c) => data.loans.find((l) => l.id === c.loanId)?.borrower.name }, { id: "o", header: "Opened", render: (c) => fmtDate(c.openedAt) }, { id: "a", header: "Assigned", render: (c) => c.assignedTo }, { id: "s", header: "Status", render: (c) => <StatusBadge status={c.status} /> }]} />
              ) : (
                <PagedTable rows={rows} rowKey={(l) => l.id} emptyText={`No ${tab.toLowerCase()} loans`}
                  columns={[
                    { id: "b", header: "Borrower", render: (l) => <><b>{l.borrower.name}</b><div style={{ color: "var(--muted)" }}>{l.reference} · {l.borrower.phone}</div></> },
                    { id: "d", header: "Days overdue", render: (l) => <b style={{ color: "var(--red-text)" }}>{l.daysOverdue}</b> },
                    { id: "o", header: "Outstanding", render: (l) => money(l.outstanding) },
                    { id: "ov", header: "Amount overdue", render: (l) => money(l.overdueAmount) },
                    { id: "lp", header: "Last repayment", render: (l) => fmtDate(last(l.id)) },
                    { id: "g", header: "Guarantor", render: (l) => gOf(l.id) },
                    { id: "s", header: "Recovery status", render: (l) => <StatusBadge status={caseFor(l.id)?.status ?? "Open"} /> },
                    { id: "x", header: "", render: (l) => (
                      <span style={{ display: "flex", gap: 6 }}>
                        <Button variant="ghost" onClick={() => navigate("loan-detail", l.id)}>Loan</Button>
                        {can("loans.recover") && (caseFor(l.id) ? <Button variant="secondary" onClick={() => setCaseId(caseFor(l.id)!.id)}>Manage</Button> : <Button variant="secondary" onClick={async () => { await service.startRecovery(l.id); notify("Recovery case opened") }}>Start</Button>)}
                      </span>) },
                  ]} />
              )}
            </Panel>
            {caseId && <RecoveryModal ctx={ctx} caseId={caseId} onClose={() => setCaseId(null)} />}
            {settings && (
              <ActionModal title="Default settings" onClose={() => setSettings(null)} submitLabel="Save" onSubmit={async () => { await service.saveSettings(settings); notify("Settings saved — loan statuses recalculated") }}>
                <div className="form-grid">
                  <NumField label="Mark as defaulted after (days overdue)" value={settings.defaultAfterDays} onChange={(v) => setSettings({ ...settings, defaultAfterDays: v })} />
                  <NumField label="Send reminder after (days overdue)" value={settings.reminderAfterDays} onChange={(v) => setSettings({ ...settings, reminderAfterDays: v })} />
                </div>
              </ActionModal>
            )}
          </>
        )
      }}
    </LoanPage>
  )
}
