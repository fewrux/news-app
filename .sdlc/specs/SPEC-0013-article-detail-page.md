---
id: SPEC-0013
intent: INT-0012
status: done
surface: product
complexity: normal
created_at: 2026-05-29T16:58:59Z
tracker:
  provider: plane
  issues: [f1b54e54-884a-44ed-b6da-1e4e92497f75]
  url: "https://api.plane.so/integritas/projects/c3ef1967-15a0-4177-bfb3-64605e06a779/issues/f1b54e54-884a-44ed-b6da-1e4e92497f75"
tracker_waiver: PLANE_* not in local .env.local; run create-from-spec after merge or in CI with secrets
provenance:
  agent_id: planner
  model: claude-4.6-sonnet-medium-thinking
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
---

# Spec — Article detail page on the Brief

## Summary

Add a product-surface route `/article/[id]` that renders a single Article's
summary and metadata. Link every headline on the Brief home view to its detail
page. Unknown ids return a not-found view. Capture `article_viewed` in PostHog
from a client tracker on the detail page.

## Behavior

- Given the Brief home view, When a reader clicks an article title (featured or
  list), Then they navigate to `/article/{id}` showing that Article's category,
  title, summary, author, date, and read time.
- Given a valid article id, When the detail page loads, Then PostHog receives
  one `article_viewed` event with `article_id` and `category`.
- Given an id that does not match any Article, When `/article/{id}` is requested,
  Then the reader sees a not-found page with a link back to the Brief.
- Given the detail page, When the reader clicks "Back to the Brief", Then they
  return to `/`.

## Acceptance criteria

| ID   | Criterion | Verifier |
|------|-----------|----------|
| AC-1 | Clicking a list article title on the Brief navigates to its detail page. | tests/e2e/article.spec.ts::navigates from Brief to article detail |
| AC-2 | Detail page shows category, title, summary, author, date, and read time. | tests/e2e/article.spec.ts::detail page renders article metadata |
| AC-3 | Unknown article id shows not-found with return link to the Brief. | tests/e2e/article.spec.ts::unknown id shows not found |
| AC-4 | "Back to the Brief" on the detail page returns to the home view. | tests/e2e/article.spec.ts::back link returns to Brief |

## Risks

- PostHog key missing locally — capture is no-op via `posthog?.capture`; no quota impact.
- Dynamic route adds build output for five static ids — negligible on Vercel Hobby.

## Technical notes

- Affected paths: `lib/articles.ts`, `lib/categories.ts`, `app/page.tsx`,
  `app/article/[id]/page.tsx`, `app/_components/article-view-tracker.tsx`,
  `tests/e2e/article.spec.ts`, `tests/e2e/home.spec.ts` (links only if selectors change).
- Doc consulted: `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`
  (dynamic routes), `04-linking-and-navigating.md` (`Link`), `10-error-handling.md` (`notFound`).

## Out of scope

- Featured hero link (optional follow-up; list items are in scope).
- `article_shared` event or share buttons.
- SEO beyond basic `generateMetadata` on the detail route.
