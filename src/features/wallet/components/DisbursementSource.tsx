import { checkOutflow, requiredApprovals, type Check } from "../domain/wallet.rules"
import type { useWallet } from "../hooks/useWallet"
import { CheckList, money } from "./WalletShell"

type WalletState = ReturnType<typeof useWallet>

export function evaluateDisbursement(w: WalletState, walletId: string, total: number, loansApproved: boolean): { checks: Check[]; approvals: number } {
  const data = w.data
  const source = data?.wallets.find((x) => x.id === walletId)
  if (!data || !source) return { checks: [{ label: "Choose a source wallet", ok: false }], approvals: 0 }
  const checks: Check[] = [
    { label: "Loan is approved", ok: loansApproved },
    ...checkOutflow({ data, source, amount: total, kind: "Disbursement", allowed: w.canOn(source, "wallet.disburse"), mode: w.mode }),
  ]
  return { checks, approvals: requiredApprovals(data.rules, "Disbursement", total).count }
}

/** Main-wallet source summary with balance, validation checks and approval requirement. Shown inside the loan disbursement flow. */
export function DisbursementSource({ w, walletId, total, loansApproved }: { w: WalletState; walletId: string; total: number; loansApproved: boolean }) {
  const sources = w.walletsWith("wallet.disburse")
  const source = sources.find((x) => x.id === walletId)
  const { checks, approvals } = evaluateDisbursement(w, walletId, total, loansApproved)
  return (
    <div style={{ marginBottom: 14 }}>
      {source && (
        <div className="wallet-hero" style={{ marginTop: 10 }}>
          <span>{source.name} · {source.accountNumber}</span>
          <b>{money(source.availableBalance)} <small style={{ fontWeight: 400, color: "var(--muted)" }}>available</small></b>
        </div>
      )}
      <p className="wallet-note">{source ? `${money(total)} will be debited from ${source.name}. ` : ""}{approvals ? `${approvals} approval${approvals > 1 ? "s" : ""} required before funds leave the wallet.` : "No additional approval required."}</p>
      <CheckList checks={checks} />
    </div>
  )
}

export const defaultDisbursementWallet = (w: WalletState) => w.walletsWith("wallet.disburse").find((x) => x.type === "Main Organization")?.id ?? w.walletsWith("wallet.disburse")[0]?.id ?? "" 

