# ScoutDeck

**The internet doesn't have an opportunity shortage. It has a relevance problem.**

ScoutDeck is an AI-powered opportunity discovery platform. Fill out a short profile, and ScoutDeck searches the live web, extracts and analyzes what it finds, and returns a ranked **top 5** — not a dump of hundreds of results you have to sift through yourself.

Built for **Hack With Dora 2.0** (20–23 Aug 2026).

---

## Try Scout Deck

Live Link: [Scout Deck](https://scout-deck.vercel.app)


## Why ScoutDeck

Every opportunity platform we looked at — Jobright, Scholly, Devpost — owns one vertical and matches within it. Nobody unifies job listings, scholarships, fellowships, hackathons, and grants under a single profile and ranks across all of them. Hackathons and fellowships in particular have no real matching layer today — just directories you scroll through by hand.

ScoutDeck searches live, reads what it finds the way a person would, and hands you five options worth actually applying to — each with a concrete, specific reason it's a fit for *you*.

---

## How it works

```
Your profile
   │
   ▼
Build search queries (skills, interests, opportunity types, location)
   │
   ▼
Search the live web (Tavily)
   │
   ▼
Scrape the top candidate pages (Firecrawl)
   │
   ▼
AI reads each page and extracts structured details
   │
   ▼
AI compares every candidate against your profile and ranks them
   │
   ▼
Your top 5 — each with a match score and a specific "why"
```

You watch this happen in real time over roughly 30–60 seconds via a live status stream, so it never feels like a black box.

**Always exactly 5 results, or fewer if the pool doesn't support 5 genuinely strong matches.** ScoutDeck won't pad the list with weak opportunities just to hit a round number — showing three great matches beats showing five mediocre ones.

---

## What makes the ranking useful

Generic "matches your skills and interests" explanations are explicitly disallowed in the ranking prompt. Every match reason has to cite two or three concrete details — specific skills, your stated interests, your location or remote preference — tied to specific facts about the opportunity itself. If ScoutDeck recommends something, it tells you exactly why, in terms you gave it.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend + backend | Next.js (TypeScript), App Router |
| Auth & database | Supabase (Postgres, Supabase Auth) |
| Validation | Zod — shared types end-to-end, validates both form input and AI output |
| Live search | Tavily |
| Live scrape | Firecrawl |
| Extraction | `openai/gpt-oss-20b` via Groq (primary), with Gemini and OpenRouter fallbacks |
| Matching & ranking | `openai/gpt-oss-120b` via Groq, one batched comparative call |
| Streaming | Server-Sent Events (SSE) over a Next.js route handler |

One runtime, one language, no second service to coordinate — a deliberate choice for a small team shipping fast.

---

## Live-first, with a silent safety net

The whole pitch rests on **live** search and scrape — you watch ScoutDeck search the web and build your list in real time, which is the actual answer to "how is this different from keyword-matching a static list." But live search alone has no floor: if search or scraping underperform for a given profile, a demo could show a thin result at the worst possible moment.

So a small pre-fetched dataset exists as a **silent fallback only**. It's never blended in by default and never mentioned in the interface — it only kicks in if live results come back too thin, and the user-facing experience looks identical either way.

---

## AI provider fallback chain

Extraction and ranking calls go through a layered fallback so a single provider hiccup doesn't sink a run:

**Groq → Gemini → OpenRouter (Nemotron 3 Ultra, free tier)**

Every call is validated against a strict Zod schema before it's trusted — if a provider returns malformed or incomplete data, ScoutDeck retries once, then moves to the next provider rather than surfacing broken data to the user.

---

## Project structure

```
src/
  app/
    api/
      opportunities/
        scout/route.ts       — authenticated SSE endpoint that runs the pipeline
      profile/                — profile CRUD
  lib/
    scout/
      pipeline.ts             — orchestrates the full search → scrape → extract → rank flow
      query-builder.ts        — turns a profile into search queries
      tavily.ts                — web search client
      firecrawl.ts             — scraping client
      ai.ts                    — extraction/ranking + provider fallback
      concurrency.ts           — throttles AI/scrape calls to respect provider rate limits
      supabase.ts              — profile, fallback pool, and persistence
      use-scout.ts              — client-side SSE consumer
supabase/
  schema.sql                  — tables and RLS policies
```

---

## Environment variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Search & scrape
TAVILY_API_KEY=
FIRECRAWL_API_KEY=

# AI providers (fallback order: Groq → Gemini → OpenRouter)
GROQ_API_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
OPENROUTER_API_KEY=
```

---

## Getting started

```bash
npm install
npm run dev
```

Runs on [http://localhost:3000](http://localhost:3000). The scout pipeline runs in the Node.js runtime (not Edge) to comfortably handle the 30–60 second multi-step external call chain.

---

## Data model

```sql
profiles (
  id, name, education_level, field_of_study, skills[],
  interests, location, remote_ok, opportunity_types[], experience_level
)

opportunities (
  id, title, organization, source_url, type, summary,
  eligibility fields (flattened), required_skills[], location,
  remote_ok, deadline, stipend, is_prefetched, source_type
)

opportunity_matches (
  profile_id, opportunity_id, match_score, match_reason
)
```

`isSaved` is derived per request from the `saved_opportunities` relationship rather than stored on the opportunity itself — one opportunity can be saved by many users independently.

---

## MVP scope

**In scope:** live search + scrape + AI ranking, streamed results, save/unsave, no-auth-required anonymous flow, a pre-fetched fallback dataset as an invisible safety net.

**Explicitly out of scope for now** (the bigger vision, revisited post-hackathon): crowdsourced opportunity submission, community/discussion features, a full AI career-guidance chatbot, and application/deadline tracking.

---

## Non-negotiables

- Top 5 results, always — never quietly drift to 10
- Live search is the default, real experience; the fallback dataset is invisible plumbing
- A single failed URL, query, or extraction call never takes down the run
- Every match reason is specific to the profile — generic explanations are forbidden by design
- Never pad results with weak matches to hit a round number

---