# Search, Scrape, and Ranking Implementation

This document describes the live discovery workflow currently implemented in ScoutDeck. It complements `SEARCH_SCRAPE_PIPELINE.md`: that file defines the intended workflow; this file documents the code that runs today.

## Entry point

The dashboard starts a run with `POST /api/opportunities/scout`.

1. The route verifies the Supabase user with `requireUserId()`.
2. It starts `runScoutPipeline()` in the Node.js runtime.
3. It streams Server-Sent Events (SSE) back to the dashboard.
4. The client reads the response stream in `src/lib/scout/use-scout.ts`, displays progress, and refreshes `/api/opportunities` when the run finishes.

The route uses `Cache-Control: no-cache, no-transform`, so intermediary services do not buffer the stream. Its maximum duration is 60 seconds.

## Pipeline

```text
Saved profile
  → build search queries
  → Tavily search
  → URL de-duplication
  → Firecrawl markdown scrape
  → AI structured extraction
  → viable-result check
  → optional Supabase fallback pool
  → AI comparative ranking
  → persist opportunities and matches
  → SSE result + dashboard refresh
```

The orchestrator is `src/lib/scout/pipeline.ts`.

### 1. Profile and query construction

`getScoutProfile()` loads the authenticated user’s `profiles` row. `buildSearchQueries()` turns their preferred opportunity types, skills, interests, location, and remote preference into one or more search queries.

If a profile has no selected opportunity types, the query builder uses its supported defaults: hackathons, fellowships, and builder programs.

### 2. Tavily search

`src/lib/scout/tavily.ts` sends each generated query to Tavily with:

- `search_depth: "advanced"`
- up to four results per query
- no raw page content requested at this stage

All query requests run concurrently. A failed Tavily request returns an empty result set instead of failing the complete pipeline. Results are de-duplicated by URL before scraping.

Required environment variable:

```env
TAVILY_API_KEY=
```

### 3. Firecrawl scrape

`src/lib/scout/firecrawl.ts` requests Markdown from Firecrawl for the first 12 unique search URLs.

- Scrapes run concurrently through `Promise.allSettled`.
- Every URL has a 10-second `AbortController` timeout.
- An unreadable, failed, or timed-out page becomes an individual failed scrape result.
- Other URLs continue; one source can never stop the full run.

Required environment variable:

```env
FIRECRAWL_API_KEY=
```

### 4. Structured extraction

Each successful Markdown scrape is passed to `extractOpportunity()`.

The primary extractor is Groq’s `openai/gpt-oss-20b`. It receives at most 18,000 characters of source text and must return a Zod-validated opportunity object containing:

- title, organisation, type, source URL, description
- eligibility, skills, location, remote status, deadline, and stipend
- confidence (`high`, `medium`, or `low`)

Extraction retries once when parsing or validation fails. If Groq is unavailable or returns invalid output, the same request is attempted with the configured Gemini model. Low-confidence candidates are excluded from the live pool.

Required environment variables:

```env
GROQ_API_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
```

## Fallback behaviour

The explicit threshold is:

```ts
MIN_VIABLE_RESULTS = 3
```

When fewer than five live candidates have medium or high confidence, ScoutDeck reads matching pre-fetched rows from Supabase (`opportunities.is_prefetched = true`). The fallback is filtered to the user’s selected opportunity types, merged with live candidates, and de-duplicated by source URL.

The fallback is deliberately not announced in the interface. If no live or fallback candidates are available, the stream ends with an honest empty-result message. The pipeline does not pad results with weak opportunities.

## Ranking and persistence

`rankCandidates()` sends the complete candidate pool and profile to Groq’s `openai/gpt-oss-120b` in one comparative ranking request. The model returns at most five matches, each with:

- a 0–100 score
- a candidate ID
- a specific match reason tied to profile facts and opportunity details

The same Gemini fallback is available if Groq fails. Scores are rounded before sending them to the client.

For live candidates, ScoutDeck stores the extracted opportunity in `opportunities`. It then upserts the user-specific ranked rows into `opportunity_matches` using `(profile_id, opportunity_id)` as the conflict key. A database persistence failure is logged but does not hide already-ranked SSE results from the user.

## SSE events

The route emits these named events:

| Event | Meaning |
| --- | --- |
| `progress` | Current stage, message, and optional count |
| `result` | Final ranked result payload |
| `error` | Safe user-facing failure message |

Progress stages are `searching`, `sources_found`, `extracting`, `checking_eligibility`, `ranking`, and `done`.

## Related files

- `src/app/api/opportunities/scout/route.ts` — authenticated SSE route
- `src/lib/scout/pipeline.ts` — workflow orchestration
- `src/lib/scout/query-builder.ts` — profile-to-query logic
- `src/lib/scout/tavily.ts` — web search client
- `src/lib/scout/firecrawl.ts` — Markdown scraping client
- `src/lib/scout/ai.ts` — extraction/ranking and provider fallback
- `src/lib/scout/supabase.ts` — profile, fallback, and persistence operations
- `src/lib/scout/use-scout.ts` — dashboard SSE consumer
- `supabase/schema.sql` — required tables and RLS policies
- `supabase/scout_pipeline_migration.sql` — migration for an existing project
