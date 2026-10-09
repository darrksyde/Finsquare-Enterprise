import type { Wallet } from "../types/wallet.types"
import { WalletStatusBadge, balanceOf, type WalletCtx } from "./WalletShell"

export default function WalletCard({ wallet, ctx, onClick }: { wallet: Wallet; ctx: WalletCtx; onClick?: () => void }) {
  return (
    <button type="button" className="wallet-card" onClick={onClick}>
      <div className="wallet-card-top">
        <span className="wallet-card-type">{wallet.type}{wallet.branchName ? ` · ${wallet.branchName}` : ""}</span>
        <WalletStatusBadge status={wallet.status} />
      </div>
      <b className="wallet-card-name">{wallet.name}</b>
      <div className="wallet-card-balance">{balanceOf(ctx, wallet)}</div>
      <div className="wallet-card-foot">
        <span>{wallet.bankName} · {wallet.accountNumber}</span>
        {wallet.pendingBalance > 0 && ctx.canOn(wallet, "wallet.view_balance") && <span>+₦{wallet.pendingBalance.toLocaleString("en-NG")} pending</span>}
      </div>
    </button>
  )
}
