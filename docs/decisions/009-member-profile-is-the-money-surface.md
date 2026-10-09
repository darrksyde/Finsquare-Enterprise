# 009 — The member profile is the member's money surface

Date: 2026-10-05
Status: Accepted

## Context

Every module held its own view of a member and none of them met. Measured before this change:

| Where | Was |
| --- | --- |
| Route | `viewPaths["member-profile"]` was the literal `"/members/LFC-002481"`, so the profile resolved for exactly one member; `resolveView` matched any `/members/…` and `MembersPage` called `onProfile()` with no id |
| Page | `MemberProfile` rendered hardcoded demo figures — "Adewale Johnson", ₦110,000, "Maize", "4.8 hectares" — for whichever member was opened, and every tab but Overview was a placeholder reading "Records for Adewale Johnson will appear here" |
| Loans | `borrowersMock` invented member ids (`LFC-002401`…) that **did not match** the member registry (`LFC-002481`…), so no loan could ever be attributed to a member even once the page was real |
| Wallet | A member's own wallet appeared only in a separate Wallet sub-page, away from everything else about that member |
| Member list | The search box and status filter were decorative — neither filtered |

So "what does this member owe, hold and owe against" had no answer anywhere in the product, and the frontend had no single place to enforce that a member's figures are that member's alone.

## Decision

**A member's money lives on the member.** `/members/:id` owns identity, access, contributions, loans, wallet and activity. The Wallet module's member-wallet index page is deleted: member wallets are reached from Members → a member → Wallet. One member's balance has exactly one home, and there is no second list to keep in step.

**The member id is the join key, and the mocks honour it.** `viewPaths["member-profile"]` is `/members/:id`; the list passes the id; `borrowersMock` carries the registry's real member ids. Without the last part the Loans tab is permanently empty, which is a data defect that presents as a UI defect.

**Obligations are derived, in one place.** `domain/member-obligations.ts` turns contribution periods and loan instalments into a flat list of `MemberObligation`s. A period or instalment counts once it is **due and not fully paid**, so a future period is not demandable money and an overpaid one is not a credit. A missed contribution stays payable — a missed contribution is not a failed plan.

**A member's instalment shortfall is `amount - paid`, not the schedule's `balance`.** `RepaymentScheduleItem.balance` is the loan's *running* balance after that instalment. Summing it multiplied a real ₦86,000 by roughly ten and reported an already-settled loan as owing three instalments.

**One obligation per settleable key.** `periodKeyFor` gives a frequency one key per period and the contribution API settles by that key, but a monthly plan can emit two due dates inside one month. Two rows for one key meant a duplicate React key, one shared amount between two inputs, and a second row that could never be cleared. The domain keeps the earliest due date per key, and the summary counts missed periods over the same set so the "31 missed" note and the due list always agree.

**"Record payment" is one action for everything owed — but one item on screen at a time.** `services/member-payments.service.ts` orchestrates the contributions and loans services rather than introducing a third money path, and the wallet is debited **exactly once per item**: a contribution debits through its own service, which owns that rule, and a loan instalment debits here and is then recorded as already paid. No parallel ledger, no double debit. The modal asks one question — *which payment is this for?* — because a member can carry thirty-two outstanding periods, and listing them all with an input each buried the two real decisions under a wall of identical rows. **Everything outstanding** is the last option in that same selector, so a bulk settlement is still one action and no capability was lost.

**`ActionModal` closes on resolve, so validation must reject.** A validation failure that returns normally closes the modal and discards the entered amounts; `RecordMemberPayment` rejects instead, which keeps the modal open and the input intact.

**A container owns the horizontal inset; a row owns only the vertical rhythm.** `Panel` is flush by default, so a panel rendering content supplies its own padding; `.person-line`, `.log-row` and `.access-row` carry vertical padding and no horizontal padding, so the same row renders at the same density inside a flush panel and inside an already-inset disclosure body. Floors: row ≥ 44px, panel content inset ≥ 16px (20px for forms). See `ui-and-styling.md` § *Spacing: who owns the inset*.

## Consequences

- The four questions the profile must answer — who is this member, what do they owe, what do we hold for them, what has moved — are answered by the header, one attention row and one summary strip. Everything else is a tab.
- All figures are per member by construction: every slice is filtered by the id in the route, so a member's page cannot show another member's records. The backend must enforce the same scoping.
- `useMember` derives `loading` from the loaded record's own id rather than setting it in an effect, so navigating between members can never show one member's figures under another's name.
- The loans mock now carries registry member ids for the people who appear in both, which makes loans attributable to a member. Members who exist only in the loan mock keep generated ids.
- `KV` passes its column count as a `--kv-cols` custom property instead of an inline `grid-template-columns`, so it collapses on a phone. An inline `grid-template-columns` beats the class's media query — the same defect fixed for `Stats` in 007.
- Covered by tests added in the same change: `features/members/domain/member-obligations.test.ts` (due/paid/future boundaries, dedupe by key, instalment shortfall vs running balance, summary aggregation) and `features/members/domain/member-activity.test.ts` (the three-ledger merge).
- **Trade-off:** a removed route (`/wallet/members`) falls back to Overview through `resolveView`'s existing unknown-path behaviour rather than redirecting. It is now reached only by an old link or bookmark.
- **Known upstream defect, deliberately not fixed here:** `addMonths` in `features/contributions/domain/calculations.ts` uses `setMonth`, which *overflows* rather than clamping, so a monthly plan starting on the 29th–31st skips a month and repeats the next one. That is what produced the duplicate keys above. The member profile is now correct regardless — one row per key is the right rule because the payment API settles by key — but the plan's own period ledger still shows the gap and the repeat.
- **Known inconsistency, deliberately not fixed here:** `contributions.service.recordPayment` does not recompute `participant.missedCount`, so a plan can report a stale missed count after a payment while the profile (which derives from period states) reports the accurate one.
