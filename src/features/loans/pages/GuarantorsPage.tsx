import { useState } from "react"
import { SectionHeader } from "@/components/ui"
import { FilterBar, SearchInput } from "@/components/data-display/ManagementPrimitives"
import { GuarantorVerifyModal } from "../components/GuarantorVerifyModal"
import { LoanPage, PagedTable, Panel, StatusBadge, Stats, Tabs, money, type LoanPageProps } from "../components/LoanUi"
import type { GuarantorRequest, GuarantorStatus } from "../types/loan.types"

export function GuarantorsPage(props: LoanPageProps) {
  const [tab, setTab] = useState<"All" | GuarantorStatus>("All")
  const [q, setQ] = useState("")
  const [sel, setSel] = useState<GuarantorRequest | null>(null)
  return (
    <LoanPage {...props}>
      {(ctx) => {
        const { data } = ctx
        const all = data.guarantorRequests
        const rows = all.filter((g) => (tab === "All" || g.status === tab) && `${g.guarantor.name} ${g.guarantor.phone}`.toLowerCase().includes(q.toLowerCase()))
        const ref = (g: GuarantorRequest) => g.loanId ? data.loans.find((l) => l.id === g.loanId)?.reference : data.applications.find((a) => a.id === g.applicationId)?.reference
        return (
          <>
            <SectionHeader eyebrow="LOANS" title="Guarantors" description="Members and external guarantors do not need a FinSquare account — verify them manually." />
            <Stats items={(["Pending", "Verified", "Accepted", "Rejected"] as const).map((s) => ({ label: s, value: all.filter((g) => g.status === s).length }))} />
            <Tabs value={tab} onChange={setTab} tabs={(["All", "Pending", "Verified", "Accepted", "Rejected"] as const).map((t) => ({ id: t, label: t }))} />
            <Panel>
              <FilterBar><SearchInput value={q} onChange={setQ} placeholder="Search guarantor name or phone" /></FilterBar>
              <PagedTable rows={rows} rowKey={(g) => g.id} onRowClick={setSel}
                columns={[
                  { id: "n", header: "Guarantor", render: (g) => <b>{g.guarantor.name}</b> },
                  { id: "c", header: "Contact", render: (g) => g.guarantor.phone },
                  { id: "r", header: "Relationship", render: (g) => g.guarantor.relationship },
                  { id: "t", header: "Type", render: (g) => g.guarantor.type },
                  { id: "l", header: "Guaranteed loan", render: (g) => ref(g) },
                  { id: "a", header: "Guarantee", render: (g) => money(g.amount) },
                  { id: "m", header: "Verified by", render: (g) => g.verificationMethod ?? "—" },
                  { id: "d", header: "Docs", render: (g) => g.documents.length },
                  { id: "s", header: "Status", render: (g) => <StatusBadge status={g.status} /> },
                ]} />
            </Panel>
            {sel && <GuarantorVerifyModal req={all.find((g) => g.id === sel.id) ?? sel} ctx={ctx} onClose={() => setSel(null)} />}
          </>
        )
      }}
    </LoanPage>
  )
}
