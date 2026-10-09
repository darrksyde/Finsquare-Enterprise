# 010 — Communications is an operational messaging workspace

Date: 2026-10-05
Status: Accepted

## Context

Communications was a placeholder. The `communication` view had no branch in `app.tsx`, so it fell
through to `GenericPage` and rendered *"This module is enabled and ready to configure"* with a
button that toasted `"New communicatio action opened"`. There was no feature folder, no types, no
repository, no permissions and no data — a module that appeared in the sidebar and did nothing.

What the product needs is the tool an organization reaches for when it has to tell members
something: who am I sending to, what am I sending, what will it cost, send.

## Decision

**One page, two tabs, one modal.** `/communication` holds the SMS balance and a `Compose` /
`History` tab row; a message opens in a modal. The balance block leads the page — what you can still
afford comes before what you are writing — so the page renders its own `Tabs` rather than using
`ShellPage`'s `tabs` prop. History is a tab inside one view, so a detail *route* would lose the
active tab on Back; the modal keeps the list and the record in one place.

**The module id stays `communication`; only the display names change.** The sidebar section becomes
**Communications** and its item **Messaging**. `enabledModules` is persisted in `localStorage`
(`finsquare-org`), so renaming the id would silently disable the module for anyone with saved state —
a rename that looks cosmetic and breaks a feature.

**The SMS balance is funded from the existing wallet, never a second payment rail.**
`topUpBalance` debits a chosen **organization** wallet with
`walletService.spend({ type: "Payment", kind: "Withdrawal" })` and credits the balance, so the
wallet's own balance, limits and per-wallet access all still apply. A member wallet is not offered:
it is not a treasury account. `communication.manage_balance` is organization-only because it spends
organization money, and it does not replace the wallet's checks.

**Costing is domain logic, and email costs nothing.** `smsSegments` uses 160 for a single part and
**153** beyond it, because every part after the first carries 7 characters of concatenation header.
`estimateCost` prices parts × reachable recipients × rate; this organization pays per text rather
than for its own mailbox, so email adds nothing — a provider that charges per email adds its line to
`total` in one place.

**Only a text actually submitted is billed.** Someone with neither a phone number nor an address
fails with a reason and costs nothing, while a carrier failure after submission still costs. This
keeps `Message.cost` exactly equal to `estimateCost().total` for the same input; without it a test
caught a recipient with no phone number being charged for an SMS that was never sent.

**One token, not a merge-field builder.** `{name}` is substituted per recipient at send time, which
is what lets a single bulk reminder read *"Hi David…"*. The stored body keeps the token — there is no
single "sent text" for a message that greeted six people differently — and the editor shows what the
first recipient will actually receive.

**Reminders generate text from real records, and nothing more.** The contribution shortcut takes the
amount from the plan (omitting it for Flexible and Target plans, whose contributors pay different
amounts, rather than stating a figure that is wrong for somebody) and the due date from the plan's
schedule; the loan shortcut is one loan, one borrower, so its figure and date are exact. Both only
prefill the editor and preselect people. Each is mounted only when chosen, and hidden when its module
is disabled.

**De-duplication is the point of recipient resolution.** A person in two selected groups, or in a
group *and* a branch, is one recipient and one charge. Membership rows are read only for the groups
actually selected.

**No scheduling UI.** `Scheduled` is a real status and seeded history shows it, but a frontend-only
app has no dispatcher: a composer that created scheduled messages would build something that could
never run. The backend owns the send time.

## Consequences

- The four questions the module exists to answer are answered by the balance block, the channel row,
  the live cost meter and the confirm step. Nothing else needs explaining, and there is no second
  place to configure messaging.
- Sending is genuinely charged: the balance drops by exactly the cost, the wallet drops by exactly
  the top-up, and both are verified in the browser and in `communications.service.test.ts`.
- Removing the placeholder from `GenericPage` leaves that page's config with no `communication` entry
  and one fewer unused import.
- `MODULE_CATEGORIES` gains **Communications**, so the Modules settings page groups the module the
  same way the sidebar does.
- Permissions are a hand-maintained list in `allPermissions` (`administrators.mock.ts`). Adding the
  four `communication.*` strings there is load-bearing: without it the acting Super Admin has no
  access and every control renders dead. Finance roles also receive `communication.manage_balance`
  because they are the ones chasing repayments.
- **Trade-off:** a message cannot be created with a future send time, and the `Scheduled` filter
  therefore only ever shows seeded rows. Documented in `docs/communications.md`.
- **Trade-off:** there is no "Send message" entry point on a member profile. Carrying a member id
  into the composer needs a way to pass state through routing, which is a routing change rather than
  a communications one; picking the member in Compose achieves the same thing today.
- **Known inconsistency, deliberately not fixed:** the seeded groups' `memberCount` (a demo figure in
  the hundreds) is larger than the membership rows the mock holds, so a group's real recipient count
  comes from the rows, not from the number shown on the group record.
- Covered by tests added in the same change: `domain/messaging.test.ts` (segment boundaries, cost per
  channel, affordability, personalisation, deterministic delivery, status roll-up),
  `domain/templates.test.ts` (due-date phrasing, both reminder bodies, the amount-less variant),
  `domain/recipients.test.ts` (group and branch expansion, overlap de-duplication, status filtering),
  `schemas/message.schema.test.ts`, `repositories/mock-communication.repository.test.ts`
  (organization scoping, subscriber notification, seed consistency) and
  `services/communications.service.test.ts` (exact deduction, refusal when unaffordable, subject and
  recipient validation, unreachable-recipient billing, top-up debiting the wallet).
