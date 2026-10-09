# Contributing

## Before opening a change

1. Read `README.md` and `docs/architecture.md`.
2. Keep feature-specific code inside its feature.
3. Preserve repository boundaries; components must not call `fetch`.
4. Add tests for module, permission, onboarding, validation, or mapping logic.
5. Run all quality commands documented in the README.

## TypeScript config

`tsconfig.json` maps `@/*` to `./src/*` through `paths` **without** `baseUrl`. Since TypeScript 4.1
`paths` resolve relative to the tsconfig's own directory, so `baseUrl` is redundant here, and TS 6.0
deprecated it (`baseUrl` stops working in 7.0). Do not re-add it. Two traps come with it:

- The editor suggests `"ignoreDeprecations": "6.0"`. This project compiles with TypeScript 5.9, which
  rejects that value (`error TS5103: Invalid value for '--ignoreDeprecations'`) — it silences VS Code
  and breaks `npx tsc --noEmit -p .` at the same time.
- `baseUrl` is also what allows bare root-relative imports (`from "src/utils"`). This codebase imports
  through `@/…` or a relative path, so nothing depends on it.

Run `npx tsc --showConfig -p .` after touching the file to confirm `paths` still resolves.

## Formatting

`oxfmt` formats the codebase; its configuration lives in `.oxfmtrc.json`:

| Option | Value | Why |
| --- | --- | --- |
| `semi` | `false` | the codebase has no statement semicolons |
| `singleQuote` | `false` | the project requires double quotes |
| `printWidth` | `120` | the code is dense; the oxfmt default of 100 rewraps far more of every file |

Format **only the files you touched** (`npx oxfmt <files>`). Formatting is presentation-only: it
rewrites whitespace, quotes and trailing commas, and cannot change behaviour.

Do **not** run `oxfmt src` / `pnpm format` across the repository. The codebase has never been
machine-formatted, so a repo-wide run rewrites ~260 of the 331 source files and buries the real
change. For the same reason `pnpm format:check` reports pre-existing diffs and is **not** a gate.
Reformatting the repository is a decision of its own, not a side effect of another change.

The pinned version matters here. The project sat on `oxfmt@^0.2.0`, and a `0.x` caret range cannot
leave `0.2.x`, so it could never pick up a fix. That release dropped the separators inside inline
object types — `{ id: string memberId: string }` — which produces code that does not compile, and
oxfmt's changelog for 0.3.0 says outright *"The current version does not work; DO NOT USE."* Keep the
dependency on a current release rather than declaring a version range that cannot move.

## Naming

- React components: `PascalCase.tsx`
- Hooks: `useFeature.ts`
- Services: `feature.service.ts`
- Repositories: `feature.repository.ts`
- Schemas: `feature.schema.ts`
- Mocks: `feature.mock.ts`

Use barrel exports only at intentional feature entry points.

## Checklist before finishing a change
- `npx tsc --noEmit -p .` and `npx vitest run` pass; `pnpm run build` succeeds for risky changes.
- Reused existing components; no duplicate utilities.
- Loading, empty, error and validation states exist.
- Permissions, module enablement and demo/live gating considered.
- Docs in `docs/` updated when behaviour, routes, views or conventions change.
- Strings with apostrophes use double quotes; components are default exports where the surrounding code does so.
