# 007 — One header per screen, and progressive disclosure

Date: 2026-10-05
Status: Accepted

## Context

The app had become visually clustered: two page headers on one screen, two navigation levels at once, cross-entity data inside single-entity views, and every figure shown at maximum density. Measured on the running app:

| Page | Text nodes | Headers | Tab bars |
| --- | --- | --- | --- |
| `/contributions` | 366 | 1 | 1 (6 tabs) |
| `/contributions/:id` | 211 | **2** | **2** (6 + 5) |

A single contribution page rendered, in order: the breadcrumb bar with a Back button, a generic module header (`FINANCE / "Contribution" / "Full workspace for one contribution plan."` with a **Create contribution** action), the six module tabs, a *second* "← Contributions" back link, the plan's own header, a badge row, a recipient block, five detail tabs, and a twelve-row configuration panel that repeated the badges. Loans stacked 9 `Tabs` and 12 `SectionHeader`s across its pages, and a loan detail page carried a ghost "Back" button next to the breadcrumb's Back.

Separately, CSS had no rule giving page-level blocks vertical space: `panel → panel` gap measured **0px**. Panels physically touched, which is what made dense screens feel cramped.

## Decision

**Every screen renders exactly one header, and one navigation level.** `components/layout/ShellPage.tsx` is the contract. Its `level="detail"` variant *forbids* `tabs`/`attention` in the type system, so a detail screen cannot regress into showing the module's tabs on top of its own. `SectionHeader` gained a `meta` slot so the chips describing a record live in its header rather than in a separate row beneath it.

**A module is a front door plus a list; data lives in the entity that owns it.** A front door shows what needs an administrator (`AttentionStrip`) and the records; money detail, history, per-entity reports and settings live inside the record. Contributions went from 6 module tabs to none, retiring the `contributions-all`, `contributions-active`, `contribution-payouts`, `contribution-withdrawals` and `contribution-transactions` views and folding them into the plan.

**Advanced detail sits behind a `Disclosure`.** Anything that answers "how was this calculated" or "what is the full history" — payout arithmetic, loan terms, a contributor's period ledger, activity logs, a reporting hub's long tail of filters — is collapsed by default and available in one click. Money-control surfaces (commission, payout approval rules) are additionally gated by permissions.

**Module-level queue screens are replaced by deep links.** Rather than a cross-plan payouts table, the front door's attention strip links straight to the pending payout inside its plan.

**A chooser inside a screen is a `select`, not a second tab row.** The plan's Reports tab and the Reports hub both pick what to show from a control in the panel or page header, so only one tab row is ever visible. Switching an outer tab row replaced the inner one entirely, which is the classic confusing nesting.

**One spacing scale owns vertical rhythm.** `--gap-section` / `--gap-block` with `.page > * + *`, `.stack` and `.stack-tight`.

## Consequences

- Screens cannot drift back to two headers or two tab levels — the type blocks it, and `docs/ui-and-styling.md` records the seven rules.
- Comparing many records is now one click deeper for the columns that left the default tables (collected + available stay; withdrawn, commission, group, created date moved into the record or a filter).
- **Trade-off:** per the chosen structure there is no cross-plan payout queue. An approver reaches a payout in one click from the front door, but cannot see every pending payout in a single table. If that becomes a real operational need, it belongs on the front door as an attention item that expands, not as a module tab.
- Retiring five contribution views removed five deep-link targets; those URLs resolve to the front door.
- Verified after the pass: 26 routes × light/dark and 10 routes at 390px — zero WCAG AA contrast failures, zero console errors, no page with more than one header, no in-page back control anywhere, and no screen with more than one tab row. Detail-page text nodes dropped from 211 to 163 (`/contributions/:id`).
