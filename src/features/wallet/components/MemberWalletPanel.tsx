import { useState } from "react"
import { Button } from "@/components/ui"
import { KV, PagedTable } from "@/features/loans/components/LoanUi"
import FundWallet from "./FundWallet"
import { TxStatusBadge, fmtDate, money, type WalletCtx } from "./WalletShell"
import type { Wallet } from "../types/wallet.types"

/**
 * One member's wallet: the balance, its movement history, and the two things an administrator can
 * do from here. Self-contained, because the member profile and the wallet module both render it
 * and neither should own the funding flow.
 */
export default function MemberWalletPanel({ ctx, wallet }: { ctx: WalletCtx; wallet: Wallet }) {
  const [funding, setFunding] = useState(false)
  const canSee = ctx.canOn(wallet, "wallet.view_transactions")
  const canFund = ctx.canOn(wallet, "wallet.fund") && (wallet.status === "active" || wallet.status === "restricted")
  const transactions = ctx.data.transactions.filter((tx) => tx.walletId === wallet.id).slice(0, 10)

  return (
    <div className="stack-tight">
      <KV
        cols={3}
        items={[
          ["Available balance", money(wallet.availableBalance)],
          ["Pending", money(wallet.pendingBalance)],
          ["Account", `${wallet.bankName} ${wallet.accountNumber}`],
        ]}
      />

      <div className="contribution-filters">
        {canFund && (
          <Button variant="secondary" onClick={() => setFunding(true)}>
            Fund this wallet
          </Button>
        )}
        <Button variant="ghost" onClick={() => ctx.navigate("wallet-transactions", wallet.id)}>
          Open in transactions
        </Button>
      </div>

      {!canSee ? (
        <p className="contribution-hint">You do not have permission to see this wallet&apos;s transactions.</p>
      ) : (
        <PagedTable
          rows={transactions}
          rowKey={(row) => row.id}
          pageSize={transactions.length || 1}
          emptyText="Nothing has moved in this wallet yet."
          columns={[
            { id: "date", header: "Date", render: (row) => fmtDate(row.date) },
            { id: "what", header: "What", render: (row) => <b>{row.description}</b> },
            { id: "type", header: "Type", render: (row) => row.type },
            {
              id: "amount",
              header: "Amount",
              render: (row) => (
                <span style={{ color: row.direction === "credit" ? "var(--green-text)" : "var(--ink)" }}>
                  {row.direction === "credit" ? "+" : "−"}
                  {money(row.amount)}
                </span>
              ),
            },
            { id: "status", header: "Status", render: (row) => <TxStatusBadge status={row.status} /> },
          ]}
        />
      )}

      {funding && <FundWallet ctx={ctx} walletId={wallet.id} onClose={() => setFunding(false)} />}
    </div>
  )
}
