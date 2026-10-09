import type { Administrator, Permission, Role } from "@/types"
import type {
  ApprovalKind, ApprovalRule, Wallet, WalletAccess, WalletDataset, WalletPermission, WalletTransaction,
} from "../types/wallet.types"

/**
 * Preview-only rules. The backend recalculates and enforces every check before any balance changes.
 */
export interface Principal {
  administrator: Administrator
  roles: Role[]
}

const rolePermissions = (p: Principal): ReadonlySet<Permission> =>
  new Set(p.administrator.roleIds.flatMap((id) => p.roles.find((r) => r.id === id)?.permissions ?? []))

export function walletGrants(access: WalletAccess[], p: Principal, walletId: string): ReadonlySet<WalletPermission> {
  const subjects = new Set([p.administrator.id, ...p.administrator.roleIds])
  const granted = access
    .filter((a) => subjects.has(a.subjectId) && (a.walletId === "*" || a.walletId === walletId))
    .flatMap((a) => a.permissions)
  const base = rolePermissions(p)
  // Effective permission needs BOTH the role capability and a grant on this specific wallet.
  return new Set(granted.filter((perm) => base.has(perm)))
}

export function canOnWallet(data: WalletDataset, p: Principal, wallet: Wallet, permission: WalletPermission): boolean {
  if (wallet.scope === "branch" && wallet.branchId && p.administrator.accessScope.type === "branch" && !p.administrator.accessScope.branchIds?.includes(wallet.branchId)) return false
  return walletGrants(data.access, p, wallet.id).has(permission)
}

export const visibleWallets = (data: WalletDataset, p: Principal) =>
  data.wallets.filter((w) => canOnWallet(data, p, w, "wallet.view"))

export const walletsWith = (data: WalletDataset, p: Principal, permission: WalletPermission) =>
  data.wallets.filter((w) => canOnWallet(data, p, w, permission))

/** A wallet whose balance belongs to one member rather than the organization or a branch. */
export const isMemberWallet = (w: Wallet) => w.scope === "member"

export const memberWallets = (wallets: Wallet[]) => wallets.filter(isMemberWallet)

export const organizationWallets = (wallets: Wallet[]) => wallets.filter((w) => !isMemberWallet(w))

export function memberWalletFor(wallets: Wallet[], memberId: string): Wallet | undefined {
  return wallets.find((w) => isMemberWallet(w) && w.memberId === memberId)
}

export function requiredApprovals(rules: ApprovalRule[], kind: ApprovalKind, amount: number): { count: number; rule?: ApprovalRule } {
  const rule = rules.find((r) => r.kind === kind && amount >= r.minAmount && (r.maxAmount === undefined || amount <= r.maxAmount))
  return { count: rule?.approvalsRequired ?? 0, rule }
}

export interface Check { label: string; ok: boolean; detail?: string }

const sameDay = (iso: string) => iso.slice(0, 10) === new Date().toISOString().slice(0, 10)
export function usedToday(txs: WalletTransaction[], walletId: string, types: WalletTransaction["type"][], direction: "credit" | "debit"): number {
  return txs
    .filter((t) => t.walletId === walletId && types.includes(t.type) && t.direction === direction && sameDay(t.date) && !["Failed", "Cancelled", "Reversed"].includes(t.status))
    .reduce((s, t) => s + t.amount, 0)
}

export const money = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`

/**
 * Outflow checks shared by every movement out of a wallet, including a member spending from
 * their own wallet on a contribution. `Withdrawal` and `Contribution` share the withdrawal
 * limits; both are the holder moving their own money out.
 */
export function checkOutflow(opts: {
  data: WalletDataset
  source: Wallet
  amount: number
  kind: "Transfer" | "Disbursement" | "Withdrawal" | "Contribution"
  allowed: boolean
  destination?: Wallet
  destinationAllowed?: boolean
  mode: "live" | "simulated" | "blocked"
}): Check[] {
  const { data, source, amount, kind, allowed, destination, destinationAllowed, mode } = opts
  const dailyLimit = kind === "Transfer" ? source.limits.dailyTransfer : kind === "Disbursement" ? source.limits.dailyDisbursement : source.limits.dailyWithdrawal
  const countedTypes: WalletTransaction["type"][] =
    kind === "Transfer" ? ["Transfer"] : kind === "Disbursement" ? ["Loan Disbursement"] : kind === "Withdrawal" ? ["Withdrawal", "Dues"] : ["Contribution"]
  const used = usedToday(data.transactions, source.id, countedTypes, "debit")
  const checks: Check[] = [
    { label: "Environment allows money movement", ok: mode !== "blocked", detail: mode === "simulated" ? "Demo Mode — movement is simulated only" : mode === "blocked" ? "Money movement is disabled for this environment" : undefined },
    { label: "Source wallet is active", ok: source.status === "active", detail: source.status },
    { label: "You have permission on this wallet", ok: allowed },
    { label: "Sufficient available balance", ok: amount > 0 && amount <= source.availableBalance, detail: `${money(source.availableBalance)} available` },
    { label: "Within single-transaction limit", ok: source.limits.singleTransaction === 0 || amount <= source.limits.singleTransaction, detail: `Limit ${money(source.limits.singleTransaction)}` },
    { label: "Within daily limit", ok: dailyLimit === 0 ? false : used + amount <= dailyLimit, detail: `${money(used)} used of ${money(dailyLimit)} today` },
  ]
  if (destination) {
    checks.push(
      { label: "Destination is in the same organization", ok: destination.organizationId === source.organizationId },
      { label: "Destination wallet can receive funds", ok: destination.status === "active" || destination.status === "restricted", detail: destination.status },
      { label: "Destination is within your access scope", ok: destinationAllowed ?? false },
      { label: "Source and destination differ", ok: destination.id !== source.id },
    )
  }
  return checks
}

export const allOk = (checks: Check[]) => checks.every((c) => c.ok)

export function statement(txs: WalletTransaction[], walletId: string, from: string, to: string, closingNow: number) {
  const mine = txs.filter((t) => t.walletId === walletId && ["Completed"].includes(t.status))
  const signed = (t: WalletTransaction) => (t.direction === "credit" ? t.amount : -t.amount)
  const inRange = mine.filter((t) => t.date.slice(0, 10) >= from && t.date.slice(0, 10) <= to).sort((a, b) => a.date.localeCompare(b.date))
  const after = mine.filter((t) => t.date.slice(0, 10) > to).reduce((s, t) => s + signed(t), 0)
  const closing = closingNow - after
  const credits = inRange.filter((t) => t.direction === "credit").reduce((s, t) => s + t.amount, 0)
  const debits = inRange.filter((t) => t.direction === "debit").reduce((s, t) => s + t.amount, 0)
  let run = closing - credits + debits
  const lines = inRange.map((t) => ({ t, balance: (run += signed(t)) }))
  return { opening: closing - credits + debits, credits, debits, closing, lines }
}
