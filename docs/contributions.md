# Contributions

Contributions are configurable savings and collection plans — Ajo/esusu style daily collections, cooperative monthly contributions, welfare funds, target savings and one-off public fundraising. Each contribution is **its own plan**; there is no shared "cycle" object.

The module answers four questions for an administrator: *what is this contribution, who is contributing, where is the money going, and how much is available?*

Code lives in `src/features/contributions/`.

## Model

```text
Contribution (the plan)
├── type               Fixed | Flexible | Target
├── form               General (one pooled balance) | Personal (a balance per member)
├── participantScope   All | Selected | Open        (Open is the only scope with a public link)
├── frequency          Daily | Weekly | Monthly | Custom | None   (frequencyBased toggle)
├── groupId/Name       an existing group from features/groups, when a Selected roster came from one
├── recipient          organization account | member account | customer account | each contributor
├── commission         none | percentage | fixed    (Personal plans only)
├── payout             manual | scheduled, approvalThreshold
├── paymentMethods     wallet | bank_transfer | payment_link | cash | bank_account
└── publicLink         { slug, enabled } — every plan has one

ContributionParticipant   one row per contributor (member or external), expected amount, totals
ContributionTransaction   every money movement (contribution, withdrawal, commission, fee, adjustment, reversal)
ContributionWithdrawal    full / partial / scheduled payout with gross, commission, fees, net
ContributionPeriod        expected period per participant — Paid | Partially Paid | Late | Missed | Expected
```

Types are in `types/contribution.types.ts`; the `Contribution` type is the only shape the UI sees.

### The form is the whole shape of the plan

`form` is asked first and decides how the money is held, so it is never inferred:

| Form | Balance | Payout | Commission |
| --- | --- | --- | --- |
| **General** | one pool for the whole plan | when the pool is paid out, the plan completes | never charged |
| **Personal** | a balance per member, tracked and withdrawn separately | any member can be paid out on their own | charged when a model is configured |

`isPersonal`, `keepsRunningAfterPayout` and `commissionApplies` in `domain/contribution.rules.ts` are the only places that read the form, so a General pool can never accidentally behave like savings.

### Everything an answer can imply is derived

Four settings used to be configurable and duplicated what the rest of the configuration already said. They are now computed:

| Was a setting | Now comes from |
| --- | --- |
| `continuous` | `form === "Personal"` — a member's savings keeps running, a General pool closes when it is paid out |
| `payout.keepActiveAfterPayout` | the same as `continuous` |
| `payout.allowPartialWithdrawal` | always `true` — partial withdrawals are part of the product |
| `commission.appliesToPublicContributions` | `false` — commission is a savings concept, so it is only charged on a Personal plan |
| `createPublicLink` | `participantScope === "Open"` decides whether the pool link is live; the slug itself is always minted |
| `audience` | replaced by `participantScope` |

### Frequency is independent of type

`frequencyBased` is its own toggle. A Fixed ₦2,000 plan can be Daily, Weekly, Monthly, Custom (every *n* days) or have no schedule at all. Custom frequency stores `{ label, days }`.

A plan with a schedule generates an **expected period ledger** (`generatePeriods`), which is what makes missed/late/partial reporting possible. A missed contribution is never treated as a failed plan — it is only ever a state on a period (`periodState`).

## Recipient and money

The recipient is configured per contribution and decides where collected money is held or sent:

| Recipient | Meaning | Created from |
| --- | --- | --- |
| Organization account | Held in a branch/main wallet or the organization's bank account | `features/wallet` |
| Member account | Held **for** a specific member | `features/members` |
| Customer account | Held for a customer who may not be a member | free text on the plan |
| Each contributor | Every contributor's own wallet, so a Personal plan pays each member back | `features/wallet` |

Member, customer and contributor recipients are **not** organization money — the plan reports it as funds held for that person and available for payout (`recipientHoldsFunds`).

Balances (`domain/calculations.ts` → `contributionBalance`):

```text
totalContributed  = completed "Contribution" credits
totalWithdrawn    = gross amount of Completed withdrawals
availableBalance  = totalContributed − totalWithdrawn
pendingAmount     = Pending contribution credits
commissionAccrued = commission charged on Completed withdrawals
netPayout         = availableBalance − commission
remaining/target  = target − totalContributed   (Target plans)
```

Payouts (`payoutBreakdown`):

```text
available balance − commission − fees = net payout
```

## Member wallets

Money in and out of a plan moves through wallets, and members have wallets of their own
(`features/wallet`, see `wallet.md`). A member wallet is an ordinary wallet with
`scope: "member"` — same ledger, same limits, same access model — holding one member's own money.

| Movement | Wallet effect |
| --- | --- |
| A payment recorded with method `wallet` | **debits** the contributor's member wallet first; the contribution is only recorded once the money has moved |
| A payout completes | **credits** the recipient's wallet — each contributor's own wallet, one member's wallet, or the main organization wallet |
| A member pays through their own link | debits their member wallet and settles immediately, instead of waiting for the provider to confirm |

The service opens a member wallet on demand (`walletService.ensureMemberWallet`, idempotent) and a
Personal plan opens one for every member on its roster when it is created, so a payout never has to
create anything. A member wallet closes off transfers and disbursements (their limits are `0`) —
it can receive money and pay what the member owes, and it is never a treasury account.

A member's wallet is read and funded from that member's profile (Members → a member → **Wallet**),
next to their contribution balances — a member's money has one home. There is no member-wallet
index page in the Wallet module.

## Commission

`commissionApplies` is the single gate: commission is charged on a **Personal** plan whose
administrator chose a model, and nowhere else. Models: `none`, `percentage` (of the gross payout),
`fixed` (per payout). The payout modal always shows gross → commission → net so the administrator
sees the deduction.

## Approvals

Two people are involved when a payout is large:

- `payout.approvalThreshold` — at or below it (`requiresApproval` false) the payout is released immediately with `contributions.withdraw`.
- Above it, the request is held as `Pending approval` and needs a **different** administrator with `contributions.approve_withdrawal`. Separation of duties is enforced by `canApproveWithdrawal`; the requester sees "Awaiting another approver" instead of an Approve button.

Approving or rejecting always opens a confirmation with the payout breakdown; rejecting requires a reason, which becomes part of the payout record.

A **Full** payout completes a General pool. A Personal plan keeps running: it is a savings plan, so
the member carries on contributing. Partial withdrawals always leave the plan running.

**The form decides what a payout may address.** A Personal plan is always paid out member by
member — `requestWithdrawal` refuses a payout with no `participantId` — and a General plan is
always the whole pool, refusing one that names a member. Without that rule a pool-wide payout would
silently drain every member's balance.

## Who takes part

| Scope | Roster |
| --- | --- |
| **All members** | every active member of the organization is put on the plan at creation |
| **Selected members** | the administrator picks people, optionally starting from a group |
| **Open to everyone** | no roster — contributors arrive through the link, member or not |

Groups come from `features/groups` — the contributions module never creates its own grouping. A
group is a **shortcut for picking people** under Selected: choosing one copies its active members
into the selection (and records `groupId`/`groupName` as the roster's origin), after which any
individual can be unticked.

## Links

Every plan mints a slug, so a link always exists:

| Link | Path | When it works |
| --- | --- | --- |
| Pool | `/contribute/:slug` | `participantScope === "Open"` **and** the plan is Active. An administrator can also disable it |
| Member | `/contribute/:slug/m/:memberId` | the member is on the plan and the plan is Active — no need for the pool link to be open |

Management is deliberately one thing: **Copy link**. The pool link can be disabled from the plan's
Overview, and it goes offline automatically when the plan is closed or paused (`publicLinkAvailable`).
Member links are copied from the member's row in the Contributors tab.

Anyone with the pool link can enter a name, optional phone/email, an amount and an available payment
method — no FinSquare account is required. Wallet is only offered on a member's own link, where the
wallet is known. A member-link payment settles immediately; anything else is recorded as `Pending`
with a public reference and credited once the organization confirms settlement
(`submitPublicContribution`).

## Views

The module is a **front door plus the plan itself** — there are no module tabs.

| View | Path | Purpose |
| --- | --- | --- |
| `contributions` | `/contributions` | Front door: a "needs attention" strip (payouts to approve, contributors behind) and one filterable plan list |
| `contribution-detail` | `/contributions/:id` | The plan: Overview, Contributors, Activity, Reports |
| `contribution-create` | `/contributions/new` | One-page creation form |
| public | `/contribute/:slug` and `/contribute/:slug/m/:memberId` | Contribution page (no app shell) |

Everything about money belongs to a plan, so the old module-level `All`, `Active`, `Pending payouts`,
`Withdrawals`, `Transactions` and plan **Settings** pages are gone — their content lives inside the
plan that owns it, or behind one disclosure. `Withdrawals` and `Transactions` merged into one
**Activity** tab (they were the same question asked twice); `Pending payouts` is now the attention
strip plus an Approve/Reject row action inside Activity.

**Plan tabs** — each has one job, and none repeats another:

| Tab | General | Personal |
| --- | --- | --- |
| Overview | how much is available, what the plan is, where the money goes, the link. Payout arithmetic sits behind "Show payout maths"; the long tail (amounts, target, dates, group origin, payment methods) behind "Plan details" | the same pool block, labelled as money kept per member |
| Contributors | who has paid in and who is behind — no balance column, because the pool *is* the balance | Member · contributed · balance · status, each opening into that member's own money: contributed, balance, withdrawn, expected, outstanding, missed/late, remaining to target, their payouts, their period ledger, and **Withdraw** for them |
| Activity | every movement in one chronological list, filterable to money in / money out. Approvals appear here when a payout is waiting | the same |
| Reports | this plan only: collections over time, missed & late periods, commissions. The three reports are chosen from one select in the panel header; CSV export | the same |

The organization-wide report of the same figures stays on the central **Reports** page, under its
Contributions section; the module has no report entry in the sidebar.

### Creation is one page

`CreateContributionForm.tsx` asks five questions in the order an administrator thinks about them —
**type → form → frequency → participants → recipient** — and reveals only the fields each answer
needs. There is no stepper and no review step: the page is the review, and one button creates the
plan. Genuine but rarely-changed options (start/end date, commission, payout approval threshold,
scheduled payout, payment methods) live behind one collapsed **Advanced** disclosure with sane
defaults. Validation is `createContributionSchema`, run on submit.

## Data layer

```text
page/component → useContributions(organizationId) → contributionsService → repository → mock | API
```

- `repositories/contribution.repository.ts` — interface; every method takes `organizationId` first.
- `mock-contribution.repository.ts` — in-memory, scoped to the organization, with `subscribe` so pages refresh after a mutation.
- `api-contribution.repository.ts` — the API-backed implementation to switch on when a backend exists.
- `services/contributions.service.ts` — all commands: `createContribution`, `updateContribution`, `recordPayment`, `requestWithdrawal`, `approveWithdrawal`, `rejectWithdrawal`, `releaseDuePayouts`, `setPublicLink`, `setStatus`, `updateCommission`, `submitPublicContribution`, `findPublicContribution`. Reading and writing a wallet is delegated to `features/wallet` (`walletService.ensureMemberWallet` / `spend` / `credit`), never done here. Every method documents what the backend must re-check.

Components never touch mocks or a repository; they go through the hook. Money maths and policy live in `domain/` (`calculations.ts`, `contribution.rules.ts`, `reporting.ts`) and are covered by `*.test.ts`.

`constants.ts` holds `CONTRIBUTION_ORG_ID` — the tenant the pages currently operate on, defined once so components never import a mock for it.

## Environment gating

`useContributions` exposes `mode` from `moneyMovementMode(environment)`. In `demo`/`pending_review` a banner states that contributions can be configured but money does not move, and `MutationContext.mode` is passed straight through to the wallet module, so a contribution and the wallet always agree on whether real money may move (`simulated` flags are derived from it). No component checks `environment === "demo"` directly.

## Permissions

`contributions.view` · `create` · `update` · `close` · `record_payment` · `withdraw` · `approve_withdrawal` · `export`, plus organization-only `contributions.manage_commission` and `contributions.manage_access` (see `permissions.md`).

## Definition of done for this module

- Loading, empty and error states on every page (`ContributionPage` shell).
- Tokens only for colour — no literal hex (see `ui-and-styling.md`).
- New money maths in `domain/` with tests, never in a component.
- The mock/API boundary untouched: swapping the repository must not require a UI change.
