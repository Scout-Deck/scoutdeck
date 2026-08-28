# Recent scouting, authentication, and guest-mode changes

This document records the latest deployment-safety, authentication, and guest-mode work in ScoutDeck.

## 1. Deployment-safe scouting pipeline

The live Tavily → Firecrawl → AI extraction/ranking flow now has explicit serverless-oriented bounds:

- Search queries are capped at three, with two Tavily results per query and at most six unique scrape targets per run.
- Tavily and Firecrawl calls time out after seven seconds.
- Firecrawl scraping runs with concurrency of two.
- AI provider calls use an eight-second timeout and retain the provider fallback chain: Groq → Gemini → OpenRouter.
- Extraction runs with concurrency of two and retries a failed extraction once.
- Both authenticated and guest SSE routes enforce a 48-second client-facing deadline within a 55-second route limit.

The SSE stream emits clear progress stages for search, sources found, extraction, eligibility checks, ranking, completion, and terminal errors.

For authenticated scouting, the ranked result event is emitted before database persistence. This means the dashboard shows the newly ranked shortlist immediately, rather than waiting for opportunity and match writes to finish. Database-write failures remain non-fatal to the visible result.

When live authenticated results are too thin, ScoutDeck still ranks a small pre-fetched fallback pool. Guest mode does not use this database fallback.

Key files:

- `src/lib/scout/pipeline.ts`
- `src/lib/scout/tavily.ts`
- `src/lib/scout/firecrawl.ts`
- `src/lib/scout/ai.ts`
- `src/lib/scout/use-scout.ts`
- `src/app/api/opportunities/scout/route.ts`

## 2. Authentication and email confirmation

Signup now detects Supabase's obfuscated existing-account response where possible. Instead of presenting a second registration as successful, it switches the person to sign-in and tells them the account either already exists or awaits confirmation. This keeps Supabase's account-enumeration protection intact while giving a useful next action.

Email confirmation no longer exchanges a PKCE code tied to the browser that created the signup. The confirmation route accepts only a token-hash confirmation link:

```text
/auth/confirm?token_hash=...&type=email
```

The route verifies the token with Supabase, writes SSR-compatible auth cookies on the redirect response, and sends the confirmed person to `/profile`. This supports confirmation from another browser or device.

Key files:

- `src/app/login/page.tsx`
- `src/app/auth/confirm/route.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/proxy.ts`

### Required Supabase dashboard configuration

Before deployment, configure the canonical production Site URL and allow local, production, and applicable preview origins in Supabase Redirect URLs. In the **Confirm signup** email template, use:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
```

Full instructions and link-scanner caveats are in `docs/SUPABASE_AUTH_SETUP.md`.

## 3. Public guest mode

`/guest` is a public route linked from the login page. It presents a small profile form and uses the same live, bounded Tavily → Firecrawl → AI ranking workflow as signed-in scouting.

The guest path is deliberately isolated:

- It creates an anonymous session ID in the browser.
- It stores the guest profile context and ranked results in `localStorage` under `scoutdeck:guest:v1`.
- It calls `/api/guest/scout`, which validates the profile and never imports or calls Supabase.
- Guest results are displayed as external source links; they do not appear in authenticated dashboards or saved opportunities.

Key files:

- `src/app/guest/page.tsx`
- `src/app/api/guest/scout/route.ts`
- `src/proxy.ts`
- `src/components/app-shell.tsx`

## Environment variables

`.env.example` now identifies provider keys as server-only and includes the optional OpenRouter fallback key:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
TAVILY_API_KEY=
FIRECRAWL_API_KEY=
GROQ_API_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
OPENROUTER_API_KEY=
```

Do not expose any provider key with a `NEXT_PUBLIC_` prefix or commit populated environment files.

## Verification completed

The implementation was verified locally with:

```bash
npm run lint
npm run build
git diff --check
```

All three passed. The production build includes `/guest`, `/api/guest/scout`, and `/auth/confirm`.

## Still requiring a configured-environment smoke test

The following depend on deployed credentials and Supabase dashboard state, so they require manual verification after configuration:

1. Tavily, Firecrawl, and a configured AI provider complete a live scout run.
2. A confirmed account can open the email in a different browser/device and reach `/profile` with a valid session.
3. An authenticated result streams immediately and subsequently persists to Supabase.
4. A guest run persists only to browser storage and creates no Supabase records.
