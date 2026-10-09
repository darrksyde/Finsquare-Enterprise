# Wallet

Code: `src/features/wallet/`. Pattern: components → `hooks` → `services/wallet.service.ts` → `repositories` → `mocks/wallet.mock.ts`.

## Model
- One **main organization wallet** is the source of all payments. Account number and bank are shown on the Overview hero card. Mock bank is **9PSB** (`constants/banks.ts`, `HOME_BANK`).
- **Branch wallets** (Lagos, Ikeja, Epe in the mock) are secondary, viewed from Wallet → Branch wallets (`wallets` view).
- **Member wallets** hold one member's own money — `scope: "member"` with `memberId`/`memberName`. They are ordinary wallets (same ledger, limits and access model), not a second wallet system. A member wallet receives funding and pays what the member owes (contributions, repayments); its transfer and disbursement limits are `0` so it can never act as a treasury. **They are reached from the member, not from Wallet**: open Members → a member → **Wallet**. There is deliberately no member-wallet index page, so a member's balance has exactly one home.
- Loan disbursements are initiated from **Loans**, not Wallet.
- Contributions move money through these wallets: a wallet-method payment **debits** the contributor's member wallet, and a completed payout **credits** the recipient's wallet (`contributions.service.ts` calls `walletService.spend` / `credit`).

## Views
`wallet` (Overview: balance, Fund wallet, Transfer, recent transactions, links), `wallets` (branch wallets), `wallet-transactions` (search, filters, CSV/PDF export, detail drawer with audit and reverse), `wallet-access` (Access, Limits, Approval rules, Audit trail).

## Member wallets
`walletService.ensureMemberWallet({ memberId, memberName }, actor)` opens one on demand and returns the existing wallet if there is one, so any module can call it before moving a member's money. A Personal contribution opens one for every member on its roster when the plan is created. `isMemberWallet`, `memberWallets`, `organizationWallets` and `memberWalletFor` in `domain/wallet.rules.ts` are how the rest of the app tells them apart; the branch-wallet list and the contribution recipient picker both exclude them.

`MemberWalletPanel` (exported from the wallet barrel) renders one member's balance, statement and actions. The member profile renders it inside `WalletPage bare` so the wallet tab and the wallet module share one implementation rather than two.

Funding, spending and crediting all run the same `checkOutflow` guards. `spend` draws on a named limit bucket — `Contribution`, `Withdrawal`, `Transfer` or `Disbursement` — so a contribution debit is checked against `dailyWithdrawal` and counted as a `Contribution` movement.

## Transfers
`TransferModal` — account number (10 digits), bank, amount, narration, 4-digit PIN. Internal accounts resolve to a wallet and move instantly; external transfers create a Processing (or Completed in simulation) debit. Validation by zod `transferOutSchema`; limits and status checks in `service.checkOutflow`. The mock PIN is `1234` and **must be verified server-side** in production.

## Environment gating
`moneyMovementMode(environment)` → `live | simulated | blocked`. Demo is simulated and shows `ModeBanner` on wallet pages.

## Reports
Wallet reports (statement, transactions, funding, branch comparison) are embedded in the central Reports page (`WalletReports`, `export.ts` has `printTable` for PDF through the browser print dialog).
