# API integration

## Boundary

All HTTP calls go through `services/api/client.ts`. It provides:

- base URL handling;
- JSON request/response handling;
- request timeouts;
- normalized user-safe errors;
- a future insertion point for authentication and telemetry.

## Repositories

Important persisted domains define repository interfaces. Members currently provide:

- `MemberRepository`;
- `MockMemberRepository`;
- `ApiMemberRepository`;
- `membersService`, which selects the implementation using environment configuration.

To connect a real endpoint, update the API repository and mapper. Do not change components.

## DTO mapping

API DTOs use backend-oriented field names. Repository mappers convert them into stable frontend domain models. This allows the backend contract to evolve independently.

## Authentication

Add token acquisition through an auth provider and inject the resulting authorization header at the API client boundary. Never read authentication state inside feature repositories or components.
