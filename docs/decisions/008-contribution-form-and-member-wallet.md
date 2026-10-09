# 008 — Contribution form and member wallets

Date: 2026-10-05
Status: Accepted

## Context

The first Contributions build worked but had become the most complicated feature in the app. Measured before this change:

| Where | Was |
| --- | --- |
| Create flow | **9 steps** (`Basic → Type → Frequency → Group & contributors → Recipient → Payment → Payout → Commission → Review`) behind a `Stepper` |
| Plan detail | **5 tabs** (Overview, Contributors, Activity, Reports, Settings) plus four separate configuration panels |
| Vocabulary | `audience` (Members / Public / MembersAndPublic), `continuous`, `allowPartialWithdrawal`, `keepActiveAfterPayout`, `commission.appliesToPublicContributions`, `createPublicLink` |
| Explanation | "General/public fundraising is not a savings product, so commission does not apply" — a rule that existed only because two settings could contradict each other |
| Money | Member and customer balances existed **inside** a contribution and nowhere else. "Paid by wallet" was a label with nothing behind it: the codebase had no member wallet, and `Member` has no balance field |

The administrator could not tell, at a glance, whether a plan was one shared pot or a balance per member — the single fact that decides how every figure and every payout behaves.

## Decision

**`form` is the shape of a contribution.** `General` (one pooled balance) or `Personal` (a balance per member) is asked first and decides the plan's behaviour. `isPersonal`, `keepsRunningAfterPayout` and `commissionApplies` are the only readers of it.

**`participantScope` replaces `audience`.** `All` · `Selected` · `Open`. `Open` is the only value that puts the pool link live, so the audience and the link can no longer disagree.

**Settings that duplicate the configuration are deleted, not defaulted.** `continuous`, `payout.keepActiveAfterPayout`, `payout.allowPartialWithdrawal`, `commission.appliesToPublicContributions` and `createPublicLink` are gone and derived. A value an administrator must set twice is a value that will be set inconsistently.

**Members get wallets.** `WalletScope` gains `"member"` and `Wallet` gains `memberId`/`memberName`. Member wallets are ordinary wallets — same ledger, limits, statements and access grants — so the wallet module stays one system rather than contributions growing its own. `walletService.ensureMemberWallet` is idempotent; `spend`/`credit` are the two generic movements any module can post, each taking a limit bucket.

**Creation is one page.** Five questions in the order an administrator thinks about them, each revealing only the fields its answer needs. The `Stepper` is gone; the page is the review. Genuine but rarely-changed options live behind one collapsed Advanced disclosure.

**A payout addresses what the form holds.** A Personal plan is paid out member by member and a General pool as a whole; `requestWithdrawal` refuses the other shape rather than guessing. Without that rule a pool-wide payout on a Personal plan would silently drain every member's balance — which is exactly what it did until the browser pass caught it. The payout modal reflects the form: a member picker for Personal, an explanation of the pooled balance for General.

**The per-plan Settings tab is gone.** The facts it carried fold into the plan's header and a `Plan details` disclosure, and the link becomes one *Copy link* action with a single enable/disable on an Open plan.

**Every plan mints a link.** An `Open` plan advertises the pool link; a member plan uses the same slug for `/contribute/:slug/m/:memberId`, which identifies the member and records against their balance. This is why `publicLink` is no longer optional and `createPublicLink` is no longer a setting.

## Consequences

- The four questions a plan must answer (what is it, who contributes, where does the money go, how much is available) are answered by the header plus two panels, and nothing else needs explaining.
- Money movement is real in the model rather than simulated: a wallet payment debits the member's wallet before the contribution is recorded, so a contribution can never be recorded without the money having moved. A payout credits the recipient wallet. The backend must do both in one transaction.
- **Trade-off:** the `customer` recipient kind survives in the schema and the domain (and in seeded data) but is no longer offered by the create form, which asks for an organization account, a specific member, or each contributor. Creating a plan whose money is held for a non-member customer now needs the API.
- **Trade-off:** commission is charged only on Personal plans. A General pool that a previous configuration charged commission on keeps its stored model but stops charging — the mock seeds intentionally include this case.
- Groups remain a first-class product module but are no longer a contributions concept: a group is a shortcut for picking people under `Selected`.
- Deleting `PlanSettings.tsx` and `CreateContributionWizard.tsx` removes the two surfaces that carried most of the old terminology.
- Covered by tests added in the same change: `domain/contribution.rules.test.ts` (form-derived behaviour, links, recipients), `domain/reporting.test.ts` (form filtering), `features/wallet/domain/wallet.rules.test.ts` (member wallet separation, visibility and the contribution limit bucket), and the existing service tests now cover wallet debits, payout credits and both payout invariants.
