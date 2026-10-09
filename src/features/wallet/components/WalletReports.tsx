import { useMemo, useState } from "react"
import { ExportButtons, PagedTable, Panel, Stats, Tabs, downloadCsv, fmtDate } from "@/features/loans/components/LoanUi"
import { printTable } from "../domain/export"
import { statement } from "../domain/wallet.rules"
import { ValueSelect, money, type WalletCtx } from "./WalletShell"
import { visibleTransactions } from "./TransactionTable"

type Kind = "statement" | "transactions" | "funding" | "disbursement" | "branches"
type Table = { headers: string[]; rows: (string | number)[][] }
const iso = (d: Date) => d.toISOString().slice(0, 10)

export default function WalletReports({ ctx }: { ctx: WalletCtx }) {
  // Rendered inside the central Reports page.
  const [kind, setKind] = useState<Kind>("statement")
  const [walletId, setWalletId] = useState(ctx.wallets[0]?.id ?? "")
  const [from, setFrom] = useState(iso(new Date(Date.now() - 90 * 864e5)))
  const [to, setTo] = useState(iso(new Date()))
  const canExport = ctx.walletsWith("wallet.export").length > 0
  const txs = useMemo(() => visibleTransactions(ctx).filter((t) => t.date.slice(0, 10) >= from && t.date.slice(0, 10) <= to), [ctx.data, ctx.principal, from, to])
  const wallet = ctx.wallets.find((w) => w.id === walletId)

  const built = useMemo<{ title: string; table: Table; stats?: { label: string; value: string }[] }>(() => {
    const done = txs.filter((t) => t.status === "Completed")
    if (kind === "statement" && wallet) {
      const s = statement(ctx.data.transactions, wallet.id, from, to, wallet.availableBalance)
      return {
        title: `Statement — ${wallet.name}`,
        stats: [{ label: "Opening balance", value: money(s.opening) }, { label: "Total credits", value: money(s.credits) }, { label: "Total debits", value: money(s.debits) }, { label: "Closing balance", value: money(s.closing) }],
        table: { headers: ["Date", "Reference", "Description", "Debit", "Credit", "Balance"], rows: s.lines.map(({ t, balance }) => [t.date.slice(0, 10), t.reference, t.description, t.direction === "debit" ? t.amount : "", t.direction === "credit" ? t.amount : "", Math.round(balance)]) },
      }
    }
    if (kind === "funding") {
      const rows = done.filter((t) => t.type === "Funding")
      return { title: "Funding report", stats: [{ label: "Fundings", value: String(rows.length) }, { label: "Total funded", value: money(rows.reduce((s, t) => s + t.amount, 0)) }], table: { headers: ["Date", "Reference", "Wallet", "Sender", "Amount"], rows: rows.map((t) => [t.date.slice(0, 10), t.reference, t.walletName, t.sender, t.amount]) } }
    }
    if (kind === "disbursement") {
      const rows = done.filter((t) => t.type === "Loan Disbursement")
      return { title: "Loan disbursement report", stats: [{ label: "Disbursements", value: String(rows.length) }, { label: "Total disbursed", value: money(rows.reduce((s, t) => s + t.amount, 0)) }], table: { headers: ["Date", "Reference", "Source wallet", "Borrower", "Product", "Amount", "Approved by"], rows: rows.map((t) => [t.date.slice(0, 10), t.reference, t.walletName, t.related.memberName ?? t.recipient, t.related.productName ?? "", t.amount, t.approvedBy ?? ""]) } }
    }
    if (kind === "branches") {
      const names = [...new Set(ctx.wallets.map((w) => w.branchName ?? "Organization"))]
      const rows = names.map((n) => {
        const ws = ctx.wallets.filter((w) => (w.branchName ?? "Organization") === n)
        const mine = done.filter((t) => ws.some((w) => w.id === t.walletId))
        const sum = (f: (t: (typeof done)[number]) => boolean) => mine.filter(f).reduce((s, t) => s + t.amount, 0)
        return [n, ws.length, ws.filter((w) => ctx.canOn(w, "wallet.view_balance")).reduce((s, w) => s + w.availableBalance, 0), sum((t) => t.direction === "credit"), sum((t) => t.direction === "debit"), sum((t) => t.type === "Loan Disbursement")]
      })
      return { title: "Branch comparison", table: { headers: ["Branch", "Wallets", "Balance", "Money in", "Money out", "Disbursed"], rows } }
    }
    return { title: "Transaction report", stats: [{ label: "Transactions", value: String(txs.length) }, { label: "Money in", value: money(done.filter((t) => t.direction === "credit").reduce((s, t) => s + t.amount, 0)) }, { label: "Money out", value: money(done.filter((t) => t.direction === "debit").reduce((s, t) => s + t.amount, 0)) }],
      table: { headers: ["Date", "Reference", "Type", "Wallet", "Direction", "Status", "Amount"], rows: txs.map((t) => [t.date.slice(0, 10), t.reference, t.type, t.walletName, t.direction, t.status, t.amount]) } }
  }, [kind, wallet, txs, from, to, ctx.data, ctx.wallets])

  return (
    <>
      {canExport && <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 10 }}><ExportButtons disabled={!built.table.rows.length}
        onCsv={() => { downloadCsv(built.title.toLowerCase().replace(/\W+/g, "-"), built.table.headers, built.table.rows); ctx.notify("CSV exported") }}
        onPdf={() => printTable(built.title, built.table.headers, built.table.rows)} /></div>}
      <Tabs tabs={[{ id: "statement", label: "Wallet statement" }, { id: "transactions", label: "Transactions" }, { id: "funding", label: "Funding" }, { id: "branches", label: "Branch comparison" }]} value={kind} onChange={setKind} />
      <div style={{ height: 12 }} />
      <Panel flush={false}>
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          {kind === "statement" && <ValueSelect label="Wallet" value={walletId} onChange={(e) => setWalletId(e.target.value)} options={ctx.wallets.map((w) => ({ value: w.id, label: w.name }))} />}
          <label className="field"><span>From</span><input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="field"><span>To</span><input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
      </Panel>
      <div style={{ height: 12 }} />
      {built.stats && <Stats items={built.stats} />}
      <Panel title={built.title} subtitle={`${fmtDate(from)} – ${fmtDate(to)}`}>
        <PagedTable rows={built.table.rows} rowKey={(r) => r.join("|")} pageSize={12} emptyText="No data for this period."
          columns={built.table.headers.map((h, i) => ({ id: h, header: h, render: (r: (string | number)[]) => (typeof r[i] === "number" && !/^Wallets$/.test(h) ? money(r[i] as number) : r[i]) }))} />
      </Panel>
    </>
  )
}
