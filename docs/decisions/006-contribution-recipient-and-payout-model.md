# 006 — Contribution recipient ledger and payout approval

Date: 2026-10-04
Status: Accepted

## Context

Contributions had to cover three very different products at once: Ajo-style collections held **for a contributor**, cooperative contributions held **for the organization**, and general/public fundraising that anyone can pay into. Two questions had no obvious answer in the existing architecture:

1. Where does collected money live, given that the wallet module already owns organization and branch wallets?
2. When does a payout need a second administrator, given that loan disbursements use wallet approval *rules*?

## Decision

**Recipients are configured per contribution.** A contribution carries a `ContributionRecipient` of kind `organization` (linked to an existing wallet or organization account), `member` or `customer`. Contributions do **not** create wallets under the wallet module:

- Organization recipients link to the existing wallet/account owned by `features/wallet`.
- Member and customer recipients keep their balances **inside the contribution**, keyed by the participant row (per-member contributed / available / expected / missed figures).

This keeps the wallet module authoritative for accounts it owns, avoids a parallel wallet hierarchy, and still lets the UI answer "where is the money going?" on the plan itself. The backend is free to model the ledger differently — it only has to return the same figures.

**Payout approval uses a per-contribution threshold, not wallet approval rules.** `payout.approvalThreshold` decides whether a withdrawal is released immediately (`contributions.withdraw`) or held for a second administrator (`contributions.approve_withdrawal`) with separation of duties (`canApproveWithdrawal` rejects the requester).

## Consequences

- The contribution balance (`totalContributed`, `availableBalance`, `totalWithdrawn`, `pendingAmount`, `commissionAccrued`, `netPayout`) is computed in `domain/calculations.ts` from transactions and withdrawals, so it stays consistent no matter which recipient kind holds the money.
- Recipient is displayed everywhere a plan is shown, so no page can imply the organization holds funds that belong to a member.
- Commission can be scoped away from public contributions (`commission.appliesToPublicContributions`), matching the product rule that commission is for savings/Ajo-style plans.
- Two approval mechanisms now exist in the app (wallet rules for disbursements/transfers, contribution thresholds for payouts). They are deliberately separate: wallet rules govern wallet money, contribution thresholds govern collection plans. A future consolidation should start from this ADR.
- All of the above is frontend policy. The backend must recompute balances, re-check the threshold and re-verify separation of duties before releasing money.
