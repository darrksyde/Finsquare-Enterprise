# Branding

Two brands, and they must not be confused: **FinSquare's own mark**, which is the product's identity
and ships with the app, and a **community's logo**, which each organisation supplies at runtime.

## The product mark

The FinSquare mark is committed at **`src/assets/brand/logo.png`** (mark only — the four squares), so
the product looks finished out of the box. Replace it by dropping artwork into the same folder:

| File | Used for |
| --- | --- |
| `logo.*` | The mark, shown in both themes |
| `logo-dark.*` | Optional mark for the dark theme; falls back to `logo.*` |
| `logo-full.*` | Optional full lockup — mark and wordmark together. The built-in "FinSquare / ENTERPRISE" text is hidden when present |
| `logo-full-dark.*` | Optional full lockup for the dark theme |

`.svg`, `.png` and `.webp` all work — the extension is not part of the name.

`components/layout/Brand.tsx` resolves the files with `import.meta.glob` at build time, so:

- A **missing file is not an error.** The built-in `Landmark` mark and the wordmark are used instead, and the app never renders a broken image.
- There is no path to configure and nothing to register. Drop the file in, restart the dev server if it is already running.
- Light and dark artwork are both rendered and switched by CSS (`html[data-theme="dark"]`), so no theme observer is needed.
- Bundled artwork is hashed and its URL is written with `BASE_URL`, so sub-path hosting works without any extra configuration (see `deployment.md`).

`Brand` renders the mark at 30px next to the wordmark. `BrandMark` exports the **mark alone** at a
given size, for the places where FinSquare itself is the subject — the welcome card of the login page
and of the onboarding flow (46px). Brand comes from one of those two components everywhere; a fourth
hardcoded copy of the mark is a bug.

The wordmark is `FinSquare` over `ENTERPRISE` and only appears when a *mark* is supplied — a full
lockup replaces both.

## The favicon

**`public/brand/favicon.svg`** is linked from `index.html` with `%BASE_URL%`, so it survives sub-path
hosting. Replace the file to change it; keep the name. It is committed with the FinSquare mark so the
browser never requests a missing `/favicon.ico`.

It stays a static file on purpose: the browser asks for it by a fixed path, while the in-app mark is
bundled and hashed. If the logo changes, update both.

## A community's logo

Each organisation — every community, cooperative or union using the workspace — uploads **its own**
logo during onboarding, or later from **Settings → General → Appearance & branding**. It is stored in
workspace state (`organization.logo`, persisted under `finsquare-org`), not in this repository, and it
is rendered by `components/layout/OrgAvatar.tsx`, which falls back to the organisation's initials.

It appears in the workspace switcher, the organization page and the branding previews. A community's
logo never replaces the product mark, and the product mark never stands in for a community's.
