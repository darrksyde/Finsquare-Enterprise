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
