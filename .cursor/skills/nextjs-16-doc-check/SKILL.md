---
name: nextjs-16-doc-check
description: Verifies Next.js 16 API usage by reading node_modules/next/dist/docs/ before writing or editing files under app/. Use whenever the agent is about to add a route, layout, metadata, server component, or any Next.js-specific code, or when the user mentions Next.js, app router, server components, metadata, or routing.
---

# Next.js 16 doc check

This repo runs Next.js 16.2.6. Training data lags behind breaking changes.

## Workflow

1. Identify the API surface you are about to use (routing, metadata, fetch
   caching, server actions, middleware, etc.).
2. Find the matching file under `node_modules/next/dist/docs/`. Useful entry
   points:
   - `app/` for App Router conventions
   - `app/api-reference/` for exported APIs
   - `migrating/` for what changed
3. Read the file. Note any `Deprecated` or `Removed` admonitions.
4. In your final message and PR description, cite the doc path:
   ```
   Doc consulted: node_modules/next/dist/docs/<file>.md
   ```
5. If you cannot find documentation for the API you intended to use,
   STOP — that API may not exist in this version. Pick a documented
   alternative.

## Common traps to avoid

- `getServerSideProps`, `getStaticProps`, `pages/` — removed in App Router.
- Manual `<head>` rendering — use `metadata`/`generateMetadata` exports.
- `next/image` defaults — re-check loader and sizes behavior; defaults moved.
- Caching defaults — fetch caching changed across recent majors.
