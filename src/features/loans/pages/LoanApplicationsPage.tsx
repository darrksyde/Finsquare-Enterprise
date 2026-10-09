import { useMemo, useState } from "react"
import { Plus } from "@/icons"
import { Button, SectionHeader } from "@/components/ui"
import { FilterBar, SearchInput } from "@/components/data-display/ManagementPrimitives"
import { ApplyModal } from "../components/applications/ApplyModal"
import { DisbursementModal } from "../components/DisbursementModal"
import { LoanPage, PagedTable, Panel, StatusBadge, Tabs, fmtDate, money, type LoanPageProps } from "../components/LoanUi"
import type { ApplicationStatus, LoanApplication, LoanDataset } from "../types/loan.types"

export const guarantorSummary = (d: LoanDataset, appId: string) => {
  const r = d.guarantorRequests.filter((g) => g.applicationId === appId)
  if (!r.length) return "—"
  const ok = r.filter((g) => g.status === "Accepted" || g.status === "Verified").length
  return `${ok}/${r.length} confirmed`
}

const tabs: ("All" | ApplicationStatus)[] = ["All", "Submitted", "Under Review", "Guarantor Pending", "Approved", "Offer Sent", "Offer Accepted", "Rejected", "Disbursed", "Draft", "Cancelled"]

export function LoanApplicationsPage(props: LoanPageProps) {
  const [tab, setTab] = useState<"All" | ApplicationStatus>("All")
  const [q, setQ] = useState("")
  const [product, setProduct] = useState("All products")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [sel, setSel] = useState(new Set<string>())
  const [apply, setApply] = useState(false)
  const [bulk, setBulk] = useState<LoanApplication[] | null>(null)
  return (
    <LoanPage {...props}>
      {(ctx) => {
        const { data, can, navigate } = ctx
        const filtered = data.applications
          .filter((a) => (tab === "All" || a.status === tab) && (product === "All products" || a.productName === product)
            && (!from || a.submittedAt >= from) && (!to || a.submittedAt <= to)
            && `${a.applicant.name} ${a.reference} ${a.applicant.phone}`.toLowerCase().includes(q.toLowerCase()))
          .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
        const ready = data.applications.filter((a) => sel.has(a.id) && ["Approved", "Offer Accepted"].includes(a.status))
        return (
          <>
            <SectionHeader eyebrow="LOANS" title="Applications" description="Review, approve and disburse loan applications."
              actions={<>{can("loans.create") && <Button icon={Plus} onClick={() => setApply(true)}>New member application</Button>}{can("loan_products.create") && <Button variant="secondary" onClick={() => navigate("loan-type-create")}>Create loan type</Button>}</>} />
            {apply && <ApplyModal ctx={ctx} onClose={() => setApply(false)} />}
            <Tabs value={tab} onChange={(t) => setTab(t)} tabs={tabs.map((t) => ({ id: t, label: t, count: t === "All" ? undefined : data.applications.filter((a) => a.status === t).length }))} />
            <Panel>
              <FilterBar>
                <SearchInput value={q} onChange={setQ} placeholder="Search applicant, reference or phone" />
                <div className="management-filters">
                  <select value={product} onChange={(e) => setProduct(e.target.value)}>
                    <option>All products</option>
                    {data.products.map((p) => <option key={p.id}>{p.name}</option>)}
                  </select>
                  <input type="date" aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ height: 34, border: "1px solid var(--line-strong)", borderRadius: 6, padding: "0 8px" }} />
                  <input type="date" aria-label="To date" value={to} onChange={(e) => setTo(e.target.value)} style={{ height: 34, border: "1px solid var(--line-strong)", borderRadius: 6, padding: "0 8px" }} />
                </div>
              </FilterBar>
              {sel.size > 0 && can("loans.disburse") && (
                <div className="bulk-bar">
                  <span>{sel.size} selected · {ready.length} ready for disbursement</span>
                  <Button disabled={!ready.length} onClick={() => setBulk(ready)}>Disburse selected</Button>
                </div>
              )}
              <PagedTable rows={filtered} rowKey={(a) => a.id} onRowClick={(a) => navigate("loan-application-detail", a.id)}
                selectedKeys={can("loans.disburse") ? sel : undefined} onSelectionChange={setSel} emptyText="No applications match these filters"
                columns={[
                  { id: "a", header: "Applicant", render: (a) => <><b>{a.applicant.name}</b><div style={{ color: "var(--muted)" }}>{a.reference} · {a.applicant.type}</div></> },
                  { id: "p", header: "Product", render: (a) => a.productName },
                  { id: "r", header: "Requested", render: (a) => money(a.terms.amount) },
                  { id: "ap", header: "Approved", render: (a) => (a.approvedAmount ? money(a.approvedAmount) : "—") },
                  { id: "d", header: "Duration", render: (a) => `${a.terms.duration} ${a.terms.durationUnit.toLowerCase()}` },
                  { id: "i", header: "Interest", render: (a) => (a.terms.interestType === "Zero interest" ? "0%" : `${a.terms.interestRate}%`) },
                  { id: "g", header: "Guarantors", render: (a) => guarantorSummary(data, a.id) },
                  { id: "dt", header: "Applied", render: (a) => fmtDate(a.submittedAt) },
                  { id: "o", header: "Officer", render: (a) => a.officer },
                  { id: "s", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
                  { id: "x", header: "", render: () => <span style={{ color: "var(--blue-text)" }}>Open</span> },
                ]} />
            </Panel>
            {bulk && <DisbursementModal apps={bulk} ctx={ctx} onClose={() => setBulk(null)} onDone={() => setSel(new Set())} />}
          </>
        )
      }}
    </LoanPage>
  )
}
