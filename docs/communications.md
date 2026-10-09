# Communications

Code: `src/features/communications/`. Pattern: components → `hooks` → `services/communications.service.ts` → `repositories` → `mocks/communications.mock.ts`.

An operational messaging tool, not a marketing platform. It answers four questions and stops there:
**who am I sending to, what am I sending, what will it cost, send.** There are no campaigns, no
automation, no segmentation builder and no drag-and-drop email designer — deliberately.

## The page

`/communication` is one view with two tabs. The SMS balance block sits above the tab row, because
"what can I still afford" comes before "what am I writing".

```text
Communications
SMS balance   ₦10,000 · ~2,500 SMS left · ₦4 per SMS     [ Top up from wallet ]
[ Compose ] [ History ]
```

`ShellPage` is used without its `tabs` prop so the balance can lead the page; the tab row is rendered
by the page (`CommunicationsPage.tsx`). See `ui-and-styling.md` § *one header, one navigation level*.

## Model (`types/message.types.ts`)

| Type | Meaning |
| --- | --- |
| `MessageChannel` | `SMS` · `Email` · `Both` |
| `MessageStatus` | `Sent` · `Scheduled` · `Failed` · `Partially sent` |
| `MessageCategory` | `General` · `Contribution reminder` · `Loan reminder` |
| `Message` | The message as composed — `body` keeps the `{name}` token — plus one row per recipient |
| `MessageRecipient` | One person: the channel used, delivery status, failure reason and what they cost |
| `SmsAccount` | The balance, the unit price, and how many texts it still buys |
| `SmsTopUp` | A funding movement, so the balance is auditable like a wallet |

A recipient is one row, not one row per channel: for a `Both` message `MessageRecipient.channel` is
the **primary** channel (SMS when there is a phone number, email otherwise) and `estimateCost` counts
the email copy alongside it.

## Costing (`domain/messaging.ts`)

- `smsSegments(body)` — 160 characters fit one SMS; beyond that every part carries 7 characters of
  concatenation header, so a long message fits **153** per part. A 161-character body is 2 parts.
- `estimateCost({ channel, body, recipients, costPerSms })` — parts × reachable recipients × rate.
  **Email costs nothing**: this organization pays per text, not for its own mailbox. A provider that
  charges per email adds its line to `total` here.
- `smsRemaining(balance, costPerSms)`, `canAfford(balance, cost)`.
- `personalise(body, member)` — substitutes the single `{name}` token with the first name. One token
  is what lets one bulk reminder read *"Hi David…"*, and it is why the stored body keeps the token
  rather than a rendered name.
- `simulateDelivery(recipient, channel)` — a deterministic stand-in for the provider's delivery
  report (stable per recipient so a screen never reshuffles). A recipient with no phone number fails
  with *"No phone number on record"*; roughly one in twelve fails at the network. This is what gives
  history genuine `Failed` and `Partially sent` rows instead of a seed-only status.
- `summariseDelivery(recipients)` — rolls those outcomes into the row's status. Never returns
  `Scheduled`; that comes from the send time, not from delivery.
- `preview(body, max = 72)` — the single line a history row shows for a message. Capped by
  **character count**, not by CSS alone: a body is arbitrary length, and one 137-character preview
  made the history table 1538px inside an 1135px container, pushing its own columns off screen. It
  takes the first line that has words in it, so a body opening with a blank line still previews what
  the person actually wrote.

**Only a text actually submitted is billed.** Someone with neither a phone number nor an address
fails and costs nothing, and a carrier failure after submission still costs — which keeps
`Message.cost` equal to `estimateCost().total` for the same input.

## Recipients (`domain/recipients.ts`)

`resolveRecipients({ members, memberships, selection })` turns a selection of *all members*,
individuals, groups and branches into the people who receive the message. Groups resolve through the
existing `GroupMembership` rows (active only), branches through `Member.branchId`, and the result is
**de-duplicated by member id** — a person in two selected groups, or in a group and a branch, is
counted and charged once. Membership rows are read only for the groups actually selected
(`hooks/useGroupMemberships.ts`), not for every group in the organization.

Member status filtering (`All` / `Active` / `Pending` / `Suspended` / `Inactive`) applies to every
kind of selection.

## Reminders (`domain/templates.ts`, `components/ReminderPicker.tsx`)

Two shortcuts, generated from real records and nothing more:

```text
Hi {name}, your ₦2,000 contribution to Ikeja Daily Ajo Savings is due today.
           Please make your contribution through your FinSquare wallet.

Hi {name}, your loan repayment of ₦115,807 is due on 8 November.
           Please make your payment before the due date.
```

- **Contribution reminder** — pick a plan; the amount comes from the plan (omitted for Flexible and
  Target plans, whose contributors pay different amounts, so the message says "your contribution"
  rather than stating a figure that is wrong for somebody) and the due date from
  `scheduleFor(plan).nextDueDate`. Every contributor on the plan is preselected.
- **Loan reminder** — pick a loan; one loan is one borrower, so the amount, due date and reference in
  the message are exact and that borrower is preselected.

Both only prefill the editor. The administrator edits the wording and changes the recipients before
sending, and each shortcut is mounted only when chosen so the contribution and loan datasets are not
read until they are needed. Each is hidden when its module is disabled.

## Sending (`services/communications.service.ts`)

```text
SMS balance → cost calculated → admin confirms → message sent → balance deducted
```

`sendMessage` refuses an empty body, a send with no recipients, an email without a subject, and — the
one that matters — a send the balance cannot cover, naming both figures. The deduction happens in the
same mutation that records the message. The backend must re-check the price, recompute the cost and
deduct atomically.

## SMS balance

The organization has one SMS balance, funded from the **existing wallet system** —
`topUpBalance` debits a chosen organization wallet with `walletService.spend({ type: "Payment", kind:
"Withdrawal" })` and credits the balance. There is no second payment rail, and everything the wallet
already enforces (balance, limits, per-wallet access) still applies. A member wallet is not offered,
because it is not a treasury account.

## History

Search over the body, subject, sender and the plan or loan it came from, plus channel and status
filters, then a table: message, when, channel, recipients (with the failed count), sender, cost and
status. Clicking a row opens the message: full body, channel, send date, delivery summary, cost and
segments, sender, every recipient with their own delivery status and cost, and the failed recipients
called out with the reason. CSV and PDF through `ExportButtons`.

**A message in the list is a label, not the message.** The two lines a row shows are `preview(body)`
and the subject or category, and both are clamped to one line with `text-overflow: ellipsis`
(`.message-cell`). The full body belongs in the detail view that the row opens, not in the table:
letting it run made one row 944px wide and took the cost and status columns off screen entirely.

## Permissions

`communication.view` · `communication.send` · `communication.export`, and
`communication.manage_balance` for the top-up (organization-only, since it spends organization money).
See `permissions.md`.

## Known gaps

- **No scheduling UI.** `Scheduled` is a real status and seeded history shows it, but a frontend-only
  app has no dispatcher — a composer that created scheduled messages would build something that could
  never run. The backend owns the send time.
- **No entry point from a member.** Reaching a single member is done by picking them in Compose. A
  "Send message" action on the member profile needs a way to carry the member id into the composer,
  which is a routing change rather than a communications one.
- The seeded group `memberCount` (a demo figure in the hundreds) is larger than the membership rows
  the mock actually holds, so a group's real recipient count comes from the rows, not from the count
  shown on the group record.
- Delivery outcomes are simulated (`simulateDelivery`); a backend replaces it with the provider's
  report and must own the balance, the price and the audit record per send.
