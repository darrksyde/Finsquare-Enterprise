# Brand artwork

The **FinSquare** mark lives here. Drop a file in and it is picked up automatically — no code change
needed, and an empty folder is valid.

| File | Used for |
| --- | --- |
| `logo.png` | The mark, shown in both themes. Not committed yet — the repo previously held a broken Git LFS pointer, which was removed. Drop the real PNG here to restore the four-square FinSquare mark |
| `logo-dark.svg` | Optional mark for the dark theme. Falls back to `logo` |
| `logo-full.svg` | Optional full lockup — mark **and** wordmark together. The built-in "FinSquare / ENTERPRISE" text is hidden when this is present |
| `logo-full-dark.svg` | Optional full lockup for the dark theme |

`.svg`, `.png` and `.webp` all work; the extension is not part of the name.

Notes:

- Artwork is resolved when the app is built, so a missing file is not an error — the built-in
  `Landmark` mark and the wordmark are used instead, and the app never renders a broken image.
- The mark is drawn at 30px next to the wordmark; a standalone mark is drawn at 46px. A landscape
  lockup works best at roughly 4:1, a square mark at roughly 1:1.
- The favicon is separate: replace **`public/brand/favicon.svg`**. It has to stay a static public
  file because the browser requests it by a fixed path; everything here is bundled and hashed.
- This folder is **only** the product's own identity. A community's own logo is uploaded per
  organisation at runtime and is never a file in the repository — see `docs/branding.md`.
