# SEARCH_SCRAPE_PIPELINE.md — Implementation Plan

This covers how ScoutDeck takes a user's profile and turns it into a ranked
top-5 list of opportunities, live, via search and scraping. Read
PROJECT_CONTEXT.md first for the full product/architecture picture — this
file is the implementation plan for one slice of it: the pipeline itself.

## The flow

```
User profile
     │
     ▼
Build search queries (one per preferred opportunity type)
     │
     ▼
Tavily search → candidate URLs (deduped across queries)
     │
     ▼
Firecrawl scrape (parallel, per-URL timeout, one slow/failed URL
must never break the batch)
     │
     ▼
Extraction agent (gpt-oss-20b via Groq) → structured JSON per opportunity,
Zod-validated, retry once on bad output
     │
     ▼
Enough good (non-"low"-confidence) results?
     │                                    │
    yes                                   no
     │                                    ▼
     │                     Pull pre-fetched fallback pool from Supabase,
     │                     filtered by profile's preferred types
     │                                    │
     │                                    ▼
     │                     Merge with whatever live results DID succeed
     ▼                                    │
     └──────────────┬─────────────────────┘
                     ▼
     Matching/ranking agent (gpt-oss-120b via Groq), ONE batched call:
     full candidate pool + profile → top 5, each with score + specific "why"
                     │
                     ▼
     Stream result to frontend via SSE
```

## Build order (do this in sequence, not all at once)

1. **Query builder** — turn a profile into search intents. Build two focused
   queries per preferred opportunity type (fellowship, builder
   program, ambassador program, hackathon, scholarship, grant, or early-career
   role): a direct current-applications query and a discovery query for open
   calls or cohorts. Do not blend every preferred type into one search. Cap
   skills/interests to a few strong terms per query rather than dumping the
   whole profile in.

2. **Tavily client** — wraps the search API. Must never throw on a bad/empty
   response for one query; return an empty array instead so one weak query
   doesn't take down the whole multi-query fan-out. Run all per-type queries
   in parallel, canonicalize and dedupe URLs, then select a source-diverse
   shortlist that favours current application pages over stale social posts.

3. **Firecrawl client** — scrapes the selected URLs with bounded concurrency.
   Enforce a hard per-URL timeout (~8–10s) with `AbortController`. One slow
   or broken site must never sink the batch. Failures come back as a typed
   `{ ok: false, error }` result, not a thrown exception.

4. **Extraction agent** — `gpt-oss-20b` via Groq. One call per successfully
   scraped page. Prompt must force strict JSON output matching the
   opportunity schema (title, type, sourceUrl, eligibility, requiredSkills,
   location, isRemote, deadline, experienceLevel, stipend, description,
   application status, confidence). Every field except title/type/sourceUrl is nullable — the
   model must never invent a value that isn't in the source text. Validate
   every response with Zod before it's used; retry once on validation
   failure, then drop that URL if it fails again. Include a `confidence`
   field ("high"/"medium"/"low") and explicit application status
   (open/closed/unknown) so the orchestrator can reject known-closed or
   expired listings. Extraction is intentionally rate-limit-aware: wider
   search does not mean unbounded parallel LLM calls.

5. **Fallback pool** — a function that queries the pre-fetched Supabase
   dataset (40–80 hand-picked, pre-extracted opportunities), filtered by the
   profile's preferred types. This is a SILENT safety net only — never
   blended in by default, never mentioned to the user. It only gets pulled in
   when live results are thin (see threshold below).

6. **Orchestrator** — ties steps 1–5 together plus the fallback decision:
   ```
   viableLiveResults = extracted.filter(o => o.confidence !== 'low')

   if (viableLiveResults.length < MIN_VIABLE_RESULTS) {
     candidatePool = [...viableLiveResults, ...await getPreFetchedFallback(profile)]
   } else {
     candidatePool = viableLiveResults
   }
   ```
   `MIN_VIABLE_RESULTS` should be a named constant (start around 5), easy to
   tune during testing. This function should emit progress events (searching
   → found sources → extracting → checking eligibility → ranking → done) via
   a callback, so it can be tested standalone before ever being wrapped in
   SSE.

7. **Matching/ranking agent** — `gpt-oss-120b` via Groq. ONE batched call:
   full candidate pool + profile in, top 5 out. This is the actual product
   differentiator, so the prompt needs real care:
   - Compare candidates against each other, not just against the profile in
     isolation — better rankings than scoring in isolation.
   - Every `matchReason` must cite 2–3 concrete profile fields (specific
     skills, interests, location, experience level) tied to specific details
     of the opportunity. Generic reasons ("matches your skills and
     interests") are explicitly forbidden in the prompt.
   - Never pad to 5 — if the pool only supports 3 genuinely strong matches,
     return 3. This reinforces the core pitch ("we maximize opportunities
     worth pursuing, not opportunities shown") instead of undermining it.

8. **Test standalone before wrapping in SSE** — run the whole pipeline
   (steps 1–7) from a plain script against a real profile, with real API
   keys, before writing any streaming/route-handler code. Debugging prompt
   quality and streaming behavior at the same time is much harder than
   isolating them. Once the script produces good results reliably, wrapping
   it in an SSE route handler is a thin layer, not a rewrite.

## Model choices (already decided, don't relitigate mid-build)

- Extraction: `openai/gpt-oss-20b` — high-volume task, needs speed/cost, not
  frontier reasoning
- Matching/ranking: `openai/gpt-oss-120b` — one call per session, quality of
  reasoning matters more here, and it's still far faster than alternatives
  like Qwen3.6-27b that were considered (8–11x in benchmarks) which matters
  directly against the SSE time budget
- Both via Groq — one provider, one latency profile to plan around

## Non-negotiables

- Always exactly 5 results at most — never silently drift to 10
- Live search is the default, real experience — fallback is invisible
  plumbing, never surfaced in UI copy or status messages
- No single failed URL, query, or extraction call may crash the whole run
- Every match reason must be specific to the profile, never generic
- Don't pad the result list with weak matches just to hit 5
