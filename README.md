# FinSquare Enterprise

FinSquare Enterprise is a configurable operating workspace for cooperatives, associations, unions, and other member-based organizations. The current application demonstrates onboarding, member digitization, module configuration, compliance, corporate-account setup, and go-live activation.

## Tech stack

- React 19 and TypeScript
- Vite 8
- React Router
- Tailwind CSS v4 plus application design tokens
- Zod for boundary validation
- Vitest for domain tests
- ESLint and oxfmt for code quality

## Running locally

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The dev server listens on `http://localhost:5173` by default (or on the port set in the `PORT` environment variable).

## Quality commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm build
```

## Project structure

```text
src/
├── app/                  # Composition root, providers, routes, app configuration
├── components/           # Reusable UI, layout, navigation, and feedback components
├── features/             # Product domains and their UI, hooks, services, schemas, mocks
├── services/api/         # Backend-independent HTTP boundary
├── lib/                  # Permissions, capabilities, error mapping, utilities
├── types/                # Shared domain contracts
├── icons.tsx             # Source-resolvable icon primitives
└── index.css             # Existing visual system and themes
```

Feature directories own product-specific components and data boundaries. Generic visual components belong in `components/`.

## Architecture

The application uses a feature-oriented architecture and a consistent data flow:

```text
Feature component → feature hook → feature service/repository → mock or API implementation
```

`WorkspaceProvider` contains genuinely global organization state: environment, module configuration, compliance status, corporate-account status, and UI preferences. Local interaction state stays within the relevant page or overlay.

See [`docs/architecture.md`](docs/architecture.md) for details.

Groups, branch hierarchy, administrator scope, and role management are documented in
[`docs/organization-management.md`](docs/organization-management.md).

## API integration

Set `VITE_ENABLE_MOCKS=false` and configure `VITE_API_URL` to select API-backed repositories. Components continue to call feature services and do not know which implementation is active.

See [`docs/api-integration.md`](docs/api-integration.md).

## Mock data

Mocks live beside their feature under `features/<feature>/mocks`. They model backend responses or domain entities and are never embedded as large arrays in page components.

## Authentication

Authentication is intentionally not implemented in the prototype. A future auth provider belongs in `app/providers`; token retrieval should be injected into `services/api/client.ts`, not feature components.

## Permissions and modules

- Permissions are defined in `types/permission.ts` and evaluated by `lib/permissions`.
- Environment capabilities are centralized in `lib/permissions/capabilities.ts`.
- Module metadata and dependency rules live in `app/config/module-registry.ts`.
- Sidebar visibility and module settings use the same registry.

## Adding a new feature

1. Create `features/<feature>/` with only the folders the feature needs.
2. Define domain contracts in `types/` when shared, or within the feature when private.
3. Add a repository interface and mock/API implementations for persisted data.
4. Expose operations through a feature service or hook.
5. Add the route and navigation metadata in `app/config`.
6. Add domain tests for business rules.

## Adding an API endpoint

1. Add its path builder to `services/api/endpoints.ts`.
2. Add DTO types and a DTO-to-domain mapper.
3. Implement the operation in the feature’s API repository.
4. Keep components unchanged.

## Adding a module

Add one definition to `app/config/module-registry.ts`, including dependencies and category. Add navigation metadata only when the module has a page. Dependency validation and sidebar visibility use this configuration.

## Adding a permission

Add the permission to `types/permission.ts`, assign it to role data, and use `hasPermission`, `canAny`, or `canAll` at the route/action boundary. Backend authorization remains mandatory.

## Adding a form

Create a Zod schema in the feature’s `schemas/` directory, infer its form type, and keep submission in a feature hook/service. Generic fields and feedback remain in `components/ui`.

## Build and deployment

`pnpm build` creates the Vite production bundle in `dist/`. Deployment environment variables must be supplied by the hosting platform. Never commit credentials.
