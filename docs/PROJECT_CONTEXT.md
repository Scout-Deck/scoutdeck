# PROJECT_CONTEXT.md — ScoutDeck (Hack With Dora 2.0)

This is the single source of truth for how ScoutDeck is built. Read this in full
before writing any code. It covers the product, the architecture, the tech
decisions (and why), the data model, and the build workflow. If something you're
about to build contradicts this file, stop and flag it rather than improvising.

---

## 1. What we're building

**ScoutDeck** is an AI-powered opportunity discovery platform. A user fills out a
short profile (skills, education/experience, interests, location, preferred
opportunity types). ScoutDeck then searches the web **live**, extracts and
analyzes what it finds, and returns a **ranked top 5** — not a dump of hundreds of
results.

Core pitch: *"The internet doesn't have an opportunity shortage. It has a
relevance problem. We don't show people more opportunities — we help them find
the right ones."*

Built for **Hack With Dora 2.0** (20–23 Aug 2026), which requires a public launch
on Product Hunt or Peerlist. Judging weights: Innovation 25%, Problem-solution
fit 20%, Usability/design 20%, Execution/craft 15%, Impact/storytelling 10%,
Feasibility/scale 10%.

**The differentiator vs. every competitor we researched** (Jobright, Scholly,
Devpost, etc.): every existing product owns one vertical (jobs *or*
scholarships *or* hackathons) and matches within it. Nobody unifies opportunity
types under one profile and ranks across all of them. Hackathons/fellowships
specifically have *no* existing matching layer at all — pure directories — which
is why that's our demo-focus vertical.

**Always exactly 5 results, not 10, not "as many as we found."** This number is
load-bearing for the pitch — don't let it drift during implementation.

---

## 2. MVP scope (locked)

1. User creates a simple profile (skills, education/experience, interests,
   location, preferred opportunity types)
2. ScoutDeck searches and scrapes the web **live**, in response to that
   submission (not from a static pre-built list)
3. AI extracts structured data from what it finds (eligibility, required
   skills, location, deadline, experience level, etc.)
4. AI matches + ranks the extracted opportunities against the user's profile
5. User sees a streamed "in progress" experience (SSE) for ~30–60 seconds while
   this happens, then gets their top 5, each with a match score and a specific,
   concrete "why this fits you" explanation
6. User clicks through to the original source to verify and apply

**Explicitly out of scope for the MVP** (from the earlier, larger UX vision —
revisit post-hackathon, not now):
- Authentication / user accounts (no auth for the MVP — anonymous
  session/browser-stored id only)
- Crowdsourced opportunity submission, founder/hiring callouts
- Community threads, squad-finding, discussion hubs
- The full AI career-guidance chatbot (gap analysis, resume bullets, prep
  roadmaps)
- Application tracker / deadline push notifications

Do not build toward these during the hackathon. They're valid "what's next"
talking points for the pitch, not build targets.

---

## 3. Tech stack (and why)

| Layer | Choice | Why |
|---|---|---|
| Frontend + backend | **Next.js (TypeScript)**, route handlers | One runtime, one language, no second service to deploy/coordinate for a 2-dev team |
| Validation | **Zod** | Type-safe validation for both form input and LLM JSON output; `z.infer<>` derives shared TS types end to end |
| Database | **Supabase (Postgres)** | Team already knows it from prior projects; also stores the pre-fetched fallback dataset |
| Live search | **Tavily** | Purpose-built web search API, returns clean ranked URLs from a natural-language-ish query |
| Live scrape | **Firecrawl** | Scrapes clean markdown/structured content from URLs Tavily returns |
| Extraction LLM | **`openai/gpt-oss-20b` via Groq** | High-volume, low-complexity task (raw text → fixed JSON schema); fastest/cheapest model on Groq, plenty capable for deterministic extraction |
| Matching/ranking LLM | **`openai/gpt-oss-120b` via Groq** | One batched call comparing full candidate pool against profile; picked over Qwen3.6-27b for far lower latency (8–11x faster in benchmarks) which matters directly against our SSE time budget; benchmarks are close enough in quality that speed wins the tiebreak. Qwen3.6-27b is the documented fallback if ranking quality proves insufficient in testing. |
| Streaming | **SSE** via `ReadableStream` in the Next.js route handler | Native, no extra library; Node.js runtime (not Edge) if deployed on Vercel, since the flow is long-running (30–60s) with multiple sequential external calls |

**Explicitly not used:**
- **Python/FastAPI** — no numerical/ML-training workload here, just API
  orchestration + JSON; TS handles this natively and keeps one type system
  across frontend/backend
- **Cohere / embeddings / vector search** — candidate pool per session is small
  (tens to ~100 opportunities), fits in one LLM prompt directly; no retrieval
  step needed at this scale. Revisit if the pool grows past a few hundred.
- **LangChain / LangGraph** — extraction is one deterministic prompt-in/JSON-out
  call; ranking is one batched call. No multi-step agent orchestration needed
  for the MVP; plain async/await is simpler and has fewer moving parts to debug
  under time pressure.
- **`groq/compound` / `compound-mini`** — these are agentic systems that decide
  their own tool use. Our pipeline already knows exactly what each step does;
  an agent deciding things dynamically adds latency and unpredictability for no
  benefit here.

---

## 4. Architecture: live-first with pre-fetched fallback

**This is the most important architectural decision in the project — read
carefully.**

The pitch and demo are built around **live** search/scrape/match — the user
watches (via SSE) as ScoutDeck searches the web and builds their personalized
list in real time. This is the actual "wow moment" and it directly answers the
"how is this different from keyword matching on a static list" skepticism
judges are likely to have.

However, live-only has no floor — if Tavily/Firecrawl underperform for a given
profile, the user could see a thin or bad result live during judging. So:

- A **pre-fetched dataset** (40–80 opportunities, hand-picked and pre-extracted
  before the hackathon starts, stored in Supabase) exists as a **silent
  fallback only** — never blended in by default, never mentioned to the user.
- Fallback triggers only when the live path underperforms (see condition
  below). The user-facing experience and status copy are identical either way.

```
User submits profile
        │
        ▼
Build search query from profile (skills + interests + type + location)
        │
        ▼
Tavily search → top 8–12 URLs
        │
        ▼
Firecrawl scrape (Promise.allSettled, ~8–10s timeout per URL — never
Promise.all, one slow site must not sink the whole batch)
        │
        ▼
Extraction agent (gpt-oss-20b) on every URL that succeeded
        │
        ▼
   Enough good results?  (see threshold below)
        │                              │
       yes                             no
        │                              ▼
        │                   Pull from pre-fetched Supabase pool,
        │                   filtered by profile's type/interests
        │                              │
        │                              ▼
        │                   Merge with whatever live results DID
        │                   succeed
        ▼                              │
        └──────────────┬───────────────┘
                        ▼
        Matching/ranking agent (gpt-oss-120b), batched,
        full candidate pool + profile → top 5 with score + "why"
                        │
                        ▼
              Stream final result via SSE
```

**Fallback trigger condition** (implement as an explicit constant, not a vague
judgment call):
```typescript
const MIN_VIABLE_RESULTS = 5; // tune during testing

const liveResults = extractedFromLive.filter(o => o.confidence !== 'low');

const pool = liveResults.length >= MIN_VIABLE_RESULTS
  ? liveResults
  : [...liveResults, ...await getPreFetchedFallback(profile)];
```

If the final pool (live + fallback combined) still can't produce 5 confident
matches, **do not pad with weak matches** — show fewer, framed honestly (e.g.
"we found N opportunities that are a strong fit — we'd rather show you fewer
great matches than pad the list"). This reinforces the core pitch principle
rather than looking broken. Write this copy in advance; don't leave it to a
generic error boundary.

---

## 5. Data model (Supabase / Postgres)

No auth for MVP — `profiles.id` is a client-generated UUID stored in the
browser (localStorage or similar), not tied to a login.

```sql
profiles (
  id uuid primary key,
  skills text[],
  education text,
  experience_level text,
  interests text[],
  location text,
  preferred_types text[],   -- ['hackathon', 'fellowship', 'internship', ...]
  created_at timestamp
)

opportunities (
  id uuid primary key,
  title text,
  type text,                -- 'hackathon' | 'fellowship' | 'internship' | etc
  source_url text,
  raw_description text,
  eligibility text,
  required_skills text[],
  location text,
  is_remote boolean,
  deadline date,
  experience_level text,
  stipend text,
  source text,               -- 'live' | 'prefetched'
  extracted_at timestamp
)

matches (
  id uuid primary key,
  profile_id uuid references profiles,
  opportunity_id uuid references opportunities,
  match_score int,           -- 0–100
  match_reason text,         -- the "why" explanation, cites specific profile fields
  created_at timestamp
)
```

Save the final top-5 matches back to `matches` after each run — this is what
makes "check back later" true in practice, not just a pitch-deck promise, at
near-zero extra engineering cost.

---

## 6. The two AI calls, in detail

### Extraction (`gpt-oss-20b`, one call per opportunity or batched)
- Input: raw scraped text (from Firecrawl) or raw pre-fetched source text
- Output: strict JSON matching the `opportunities` schema above
- Prompt must say: output ONLY valid JSON matching the schema; use `null` for
  fields not present in the source text
- Validate every response with a **Zod schema** before it touches Supabase;
  retry once on validation failure before giving up on that URL

### Matching + ranking (`gpt-oss-120b`, one batched call per user session)
- Input: full candidate pool (structured opportunities) + user profile
- Output: top 5, ranked, each with a 0–100 score and a specific "why"
- **This is the actual product differentiator** — do not let the "why" be
  generic ("matches your skills and interests"). Prompt it explicitly to cite
  2–3 concrete profile fields it used (e.g. "You listed React and ML — this
  hackathon's track requires exactly that combo, and it's remote-friendly like
  you preferred"). This is the single highest-leverage piece of prompt
  engineering in the whole project.
- Batch the full pool into one call rather than scoring opportunities in
  isolation — lets the model compare candidates against each other, which
  produces better rankings and is cheaper/faster than N separate calls.

---

## 7. SSE streaming implementation notes

- Runtime must be **Node.js, not Edge**, if deployed on Vercel — the flow is
  30–60s with multiple sequential external API calls, which fits Node's
  execution model, not Edge's tighter limits.
- Response headers must include `Cache-Control: no-cache, no-transform` — the
  `no-transform` part specifically prevents proxies/CDNs from buffering the
  stream.
- Client-side: since `EventSource` only supports GET natively, either use GET
  with query params or read the `fetch` response stream manually if POST is
  required for the profile payload.
- Status messages shown during the 30–60s wait are doing real UX work — this is
  what the user watches for the entire wait. Write them with care (plain,
  confident, specific — matches DESIGN.md tone), not generic "Loading...".
  Example progression: "Searching the web for opportunities..." → "Found N
  sources, extracting details..." → "Checking eligibility against your
  profile..." → "Ranking your top matches...". These stay identical regardless
  of whether the fallback path fires underneath — the fallback is invisible to
  the user.
- Wrap the whole handler in try/catch with `Promise.allSettled` for the scrape
  fan-out — one failed URL must never sink the batch.

---

## 8. Team split (2 devs)

**Dev A — Data + AI pipeline**
- Pre-hackathon: build and store the 40–80 opportunity pre-fetched fallback
  dataset in Supabase (hand-picked sources, pre-extracted)
- Tavily + Firecrawl integration
- Extraction prompt + Zod schema
- Matching/ranking prompt
- Fallback merge logic

**Dev B — Frontend**
- Profile form (Next.js/React)
- Dashboard / results feed UI (match cards — this is the demo's visual
  centerpiece, worth the most polish time)
- SSE client + streaming status UI
- Wiring to route handler endpoints

**Shared, first thing:** Supabase schema, agreed together before either dev
builds against it.

Build order matters: **Dev A should get the full pipeline working end-to-end
via a script or Postman by end of Day 2, before wrapping it in SSE.**
Debugging prompt correctness and streaming correctness at the same time is
much harder than isolating them — SSE is just a wrapper around an
already-working function.

---

## 9. Non-negotiables

- Top 5 results, always — never drift to 10 or "however many we found"
- No auth for the MVP
- Live search/scrape is the default path; pre-fetched data is a silent
  fallback only, never blended in by default and never surfaced to the user
- The "why" explanation must cite specific profile fields, never generic
  boilerplate
- One slow/failed URL must never break the whole run (`Promise.allSettled`,
  per-URL timeout)
- Never pad results with weak matches to hit 5 — show fewer, framed honestly,
  if the pool doesn't support 5 confident picks
- Simple, working code that ships > architectural purity — this is a 4-day
  hackathon build, not a production system
