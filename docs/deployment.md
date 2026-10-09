# Build and deployment

- Build: `pnpm run build` → `vite build` → `dist/`. The output is a static bundle and can be served by any static host.
- Preview the built bundle locally with `pnpm preview`.
- Type check before building: `npx tsc --noEmit -p .`.
- Environment variables are read at build time and validated in `src/app/config/env.ts` (`VITE_API_URL`, `VITE_APP_ENV`, `VITE_ENABLE_MOCKS`). Supply them through the hosting platform; never commit credentials.

## Sub-path hosting

`src/App.tsx` derives the router `basename` from Vite's `BASE_URL` and only applies it when the current URL starts with it. To host the app under a sub-path, set Vite's `base` for the build (e.g. `base: "/p/abc/"`); no other change is needed.

## Browser verification

The workspace configures the Playwright MCP server in `.vscode/mcp.json`, so a session can drive a real browser against the dev server or a served `dist/` to validate flows, console output and network requests. Serve the build statically (for example `pnpm preview`) rather than opening `dist/index.html` from disk, because the app uses `BrowserRouter`.
