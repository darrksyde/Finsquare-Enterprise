# 012 — Dues collect through a wallet lien, and the wallet announces credits

Date: 2026-10-09
Status: Accepted

## Context

Dues existed only as a placeholder: a hardcoded "Annual Membership Dues" panel in
`features/financial-operations`, a `createDuesScheme` method that returned the input with an id, and
a `DuesScheme` type. The sidebar item had no permission, so it was reachable by anyone with the
module enabled, and there was no plan, no participant, no charge and no payment.

The brief asks for something specific and unusual: a plan states a **fixed** amount per scheduled
payment, and when a payment falls due and stays unpaid the organization **claims the member's wallet**
— the outstanding dues are to be deducted automatically once sufficient funds are available.

Two questions had to be answered before writing any code: *where does the obligation live* (dues or
wallet), and *what triggers a collection* in an application that has no backend and no scheduler.

## Decision

**The obligation belongs to dues; the deduction belongs to the wallet.** A `DuesCharge` is a dues
record and its `lienState` says whether a claim stands. The money moves through
`walletService.spend`, exactly as a contribution or a loan repayment does. Neither module grows a
shadow ledger: `RelatedRecords` gained `duesId`/`duesName` (mirroring `contributionId`) and
`TransactionType` gained `"Dues"`, so the wallet's own statement names the plan and a dues debit
draws on the member wallet's withdrawal limit like any other outflow.

**A lien is a claim, not a reservation.** Nothing is earmarked or held; the claim exists, is shown,
and is collected when the money is actually there. This is why a claim can sit `Pending` for weeks
without being an error, and why "awaiting wallet recovery" is a status an administrator is meant to
read rather than a failure to hide.

**Recovery is capped in two places, and never runs twice.** The allocation is
`min(charge.outstanding, remaining balance)` per charge, oldest due first, so a part payment and a
wallet that cannot cover everything both fall out of the arithmetic rather than being special cases.
A run reads the charges' *current* `paidAmount`, and an in-flight guard refuses a second run for the
same scope, so an automatic pass and an administrator pressing **Recover now** cannot both take the
same money. A deduction the wallet's own limits refuse stops that member's run and leaves the charge
outstanding with the reason recorded — the run never reaches past a charge it could not collect,
because that would break "oldest dues first".

**The wallet announces credits; it does not learn about dues.** `walletService.onWalletsCredited`
notifies listeners after money lands in a wallet, and the dues service subscribes to collect what it
is owed. The alternative — teaching the wallet about dues, or having dues poll — couples the ledger
to a module that happens to claim a balance, and a lien is not the only conceivable claimant. The
announcement is deliberately generic and a listener is wrapped so that a failing claim can never fail
the payment that funded it.

**Both triggers are explicit.** (1) a credited wallet, and (2) an administrator's **Recover now**
(`dues.recover`). Both were chosen with the product owner because a frontend-only app has no
scheduler: recovery is therefore deterministic and observable in a demo, and the backend replaces the
first trigger with a scheduled job and an event consumer.

**Dues are configurable per plan, and the rules are organization-only.** `enabled` / `graceDays` /
`autoRecover` are set on the plan (Advanced, at creation) and editable afterwards through
`dues.manage_rules` — organization-only, because the rules decide when the organization takes money
out of a member's wallet. Pausing a plan stops it taking on *new* claims while a claim already
applied stays; closing it also drops charges that are not due yet, so a closed plan stops demanding
money without erasing what is owed.

**Money is derived, never stored twice.** A `DuesParticipant` has no money fields at all: paid,
outstanding, overdue and paid-up/behind are computed from the charge ledger on read. The contribution
ledger carries a stored `missedCount` and `docs/README.md` already records that it can go stale after
a payment; dues is built so that class of bug cannot exist.

**Outstanding means payable now.** A charge whose due date is ahead is `Pending` and reported as
*scheduled*, not as outstanding, so a plan's total expectation is never read as today's debt. The
member profile applies the same rule to contribution periods.

**A member's dues appear on the member profile.** The brief asks dues to integrate with Members, and
the project's rule is that a member's money lives on the member profile: `memberObligations` folds
`duesObligations` in beside contributions and loan instalments, the profile gains a **Dues** tab, and
**Record payment** settles a dues charge through the same cross-module path. The member activity feed
shows the dues ledger's row and suppresses the wallet's duplicate row for the same money.

## Consequences

- Dues follows the contribution module's shape (types → domain → repository/mock/api → service → hook
  → pages), so it is backend-ready without a UI rewrite: swapping `MockDuesRepository` for
  `ApiDuesRepository` is the only change needed.
- `domain/` gained unit tests for the schedule (including the month-clamp that the contribution
  schedule gets wrong), the lien rules, the allocation caps, the totals, the report rows and the
  roster resolution; the service has tests for partial payment, the refusal to overpay, the
  exactly-once wallet debit, recovery capped by the wallet, no duplicate recovery, the rules that
  suppress collection, and the automatic collection triggered by a wallet credit.
- The wallet gained a generic capability (`onWalletsCredited`) and one transaction type. Both are
  additive; the wallet's existing tests still pass unchanged.
- `financial-operations` no longer owns the dues page (`FinancialPages.tsx` is deleted and
  `createDuesScheme` removed); `types/financial.ts` loses `DuesScheme`.
- The permission catalog gains a **Dues** group and an organization-only **Dues administration**
  group, and the administrator mocks must list the new strings — without that the acting Super Admin
  has no access and every dues screen renders empty.
- **Trade-off:** recovery is bounded by the member wallet's limits (a single transaction is capped at
  ₦500,000), so a very large charge cannot be collected in one deduction. This is the wallet's policy,
  deliberately not worked around in dues.
- **Trade-off:** the wallet commit and the dues commit are separate in the mock, as they are for
  contributions. The backend must do both in one transaction.
- **Trade-off:** a lien is never automatically cancelled when a member is suspended, and there is no
  per-plan cap on how long a claim stands. Neither was asked for; both belong in the backend's policy.
- Care is needed with lint: a permission added to the catalog but not to `administrators.mock.ts`
  grants nothing, which is exactly how a module renders as an empty page.
