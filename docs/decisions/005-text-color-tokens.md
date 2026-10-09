# 005 — Semantic text colour tokens

Date: 2026-10-04
Status: Accepted

## Context

Body text was styled with literal hex values declared once in `src/index.css` (for example `td { color: #4a5568 }`). The dark theme only patched a handful of selectors, so table cells, badges, icon accents and inline brand-coloured amounts failed WCAG AA in dark mode. The reported symptom was unreadable table text in dark mode — plain cell text scored ≈ 2.3:1.

## Decision

Introduce semantic text tokens with light and dark values, and route every text colour through them:

- `--ink-soft` for body copy and table cells
- `--muted` / `--faint` for secondary and tertiary text (both tightened so they clear AA on every soft surface)
- `--blue-text`, `--green-text`, `--amber-text`, `--red-text`, `--purple-text` for brand-coloured text and icons

Brand tokens (`--blue`, `--green`, `--amber`, `--red`, `--purple`) become **fills only** — solid backgrounds, borders, bars and toggles. Their values stay theme-independent so white-on-fill remains legible. Text and icons use the matching `--*-text` token.

## Consequences

- Every text token clears 4.5:1 against every surface token in both themes.
- `--muted` and `--faint` are slightly darker in light mode than before; this is a deliberate, contained visual change.
- Arbitrary user-picked colour swatches cannot be covered by tokens, so they compute a readable foreground at runtime (`readableOn()`).
- New UI must use a token for `color:`. A hard-coded hex in a `color` declaration is a review failure, and there is no dark-mode override to save it.
