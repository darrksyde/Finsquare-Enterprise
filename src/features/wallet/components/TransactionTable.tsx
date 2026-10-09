import { useMemo, useState } from "react"
import { SearchInput } from "@/components/data-display/ManagementPrimitives"
import { SectionHeader } from "@/components/ui"
import { ExportButtons, PagedTable, Panel, downloadCsv, fmtDate } from "@/features/loans/components/LoanUi"
import { printTable } from "../domain/export"
import { TRANSACTION_STATUSES, TRANSACTION_TYPES, type WalletTransaction } from "../types/wallet.types"
import TransactionDetail from "./TransactionDetail"
import { TxStatusBadge, money, type WalletCtx } from "./WalletShell"

export const transactionRow = (t: WalletTransaction) => [t.date.slice(0, 10), t.reference, t.description, t.type, t.walletName, t.amount, t.direction, t.status, t.initiatedBy, t.approvedBy ?? ""]
export const transactionHeaders = ["Date", "Reference", "Description", "Type", "Wallet", "Amount", "Direction", "Status", "Initiated by", "Approved by"]

export function visibleTransactions(ctx: WalletCtx) {
  return ctx.data.transactions.filter((t) => {
    const w = ctx.data.wallets.find((x) => x.id === t.walletId)
    return !!w && ctx.canOn(w, "wallet.view_transactions")
  })
}

export default function TransactionTable({ ctx }: { ctx: WalletCtx }) {
  const [q, setQ] = useState("")
  const [type, setType] = useState("All")
  const [status, setStatus] = useState("All")
  const [wallet, setWallet] = useState("All")
  const all = useMemo(() => visibleTransactions(ctx), [ctx.data, ctx.principal])
  const rows = all.filter((t) =>
    (type === "All" || t.type === type) && (status === "All" || t.status === status) && (wallet === "All" || t.walletId === wallet) &&
    (!q || [t.reference, t.description, t.initiatedBy, t.sender, t.recipient].some((v) => v.toLowerCase().includes(q.toLowerCase()))))
  const selected = all.find((t) => t.id === ctx.id)
  const canExport = ctx.walletsWith("wallet.export").length > 0
  return (
    <>
      <SectionHeader eyebrow="WALLET" title="Transactions" description="Every movement across the wallets you can view. Corrections are recorded as reversals, never deletions."
        actions={canExport && <ExportButtons disabled={!rows.length}
          onCsv={() => { downloadCsv("wallet-transactions", transactionHeaders, rows.map(transactionRow)); ctx.notify("CSV exported") }}
          onPdf={() => printTable("Wallet transactions", transactionHeaders, rows.map(transactionRow))} />} />
      <Panel>
        <div className="table-toolbar management-filter-bar">
          <SearchInput value={q} onChange={setQ} placeholder="Search reference, description, person…" />
          <div className="toolbar-right" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}><option>All</option>{TRANSACTION_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option>All</option>{TRANSACTION_STATUSES.map((t) => <option key={t}>{t}</option>)}</select>
            <select aria-label="Wallet" value={wallet} onChange={(e) => setWallet(e.target.value)}><option value="All">All wallets</option>{ctx.wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
          </div>
        </div>
        <PagedTable rows={rows} rowKey={(t) => t.id} pageSize={10} onRowClick={(t) => ctx.navigate("wallet-transactions", t.id)} emptyText="No transactions match these filters."
          columns={[
            { id: "d", header: "Date", render: (t) => fmtDate(t.date) },
            { id: "r", header: "Reference", render: (t) => <b>{t.reference}</b> },
            { id: "x", header: "Description", render: (t) => t.description },
            { id: "t", header: "Type", render: (t) => t.type },
            { id: "w", header: "Wallet", render: (t) => t.walletName },
            { id: "a", header: "Amount", render: (t) => <b style={{ color: t.direction === "credit" ? "var(--green-text)" : "var(--ink)" }}>{t.direction === "credit" ? "+" : "−"}{money(t.amount)}</b> },
            { id: "i", header: "Direction", render: (t) => (t.direction === "credit" ? "In" : "Out") },
            { id: "s", header: "Status", render: (t) => <TxStatusBadge status={t.status} /> },
            { id: "b", header: "Initiated by", render: (t) => t.initiatedBy },
            { id: "p", header: "Approved by", render: (t) => t.approvedBy ?? "—" },
          ]} />
      </Panel>
      {selected && <TransactionDetail tx={selected} ctx={ctx} onClose={() => ctx.navigate("wallet-transactions")} />}
    </>
  )
}
