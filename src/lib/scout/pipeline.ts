import { extractOpportunity } from "./ai";
import { runWithConcurrency } from "./concurrency";
import { scrapeAll, type ScrapeSuccess } from "./firecrawl";
import { buildSearchQueries } from "./query-builder";
import {
  getPreFetchedFallback,
  getScoutProfile,
  persistLiveCandidate,
  persistMatches,
} from "./supabase";
import { searchAllQueries, MAX_SEARCH_TARGETS } from "./tavily";
import type {
  OpportunityType,
  RankedScoutMatch,
  ScoutCandidate,
  ScoutProfile,
  ScoutProgress,
} from "./types";

const SOCIAL_HOSTS = new Set([
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "threads.net",
  "tiktok.com",
  "twitter.com",
  "x.com",
]);

export const MIN_VIABLE_RESULTS = 3;
const EXTRACTION_CONCURRENCY = 2;
const MAX_SCRAPE_URLS = MAX_SEARCH_TARGETS;

type PipelineOptions = {
  profile: ScoutProfile;
  onProgress?: (progress: ScoutProgress) => void;
};

type RunScoutPipelineOptions = {
  userId: string;
  onProgress?: (progress: ScoutProgress) => void;
  onResult?: (result: ScoutPipelineResult) => void;
};

export type ScoutPipelineResult = {
  matches: RankedScoutMatch[];
  usedFallback: boolean;
};

function emit(
  onProgress: PipelineOptions["onProgress"],
  progress: ScoutProgress,
) {
  onProgress?.(progress);
}

function isSocialUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return [...SOCIAL_HOSTS].some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

function socialCandidateType(
  profile: ScoutProfile,
  title: string,
  snippet: string,
): OpportunityType {
  const text = `${title} ${snippet}`.toLowerCase();
  const matchingType = profile.opportunityTypes.find((type) =>
    text.includes(type.replace("_", " ")),
  );
  return matchingType ?? profile.opportunityTypes[0] ?? "fellowship";
}

async function extractWithRetry(input: { url: string; markdown: string }) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await extractOpportunity(input);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function preRankCandidates(
  profile: ScoutProfile,
  candidates: ScoutCandidate[],
): ScoutCandidate[] {
  return candidates
    .map((candidate) => {
      let score = 0;

      // Student-friendly opportunities
      if (candidate.experienceLevel === "student") {
        score += 20;
      }

      // Remote opportunities
      if (candidate.isRemote === true) {
        score += 10;
      }

      // Skill overlap
      const profileSkills = profile.skills ?? [];

      const matchingSkills = candidate.requiredSkills.filter((requiredSkill) =>
        profileSkills.some(
          (profileSkill) =>
            profileSkill.toLowerCase().includes(requiredSkill.toLowerCase()) ||
            requiredSkill.toLowerCase().includes(profileSkill.toLowerCase()),
        ),
      );

      score += Math.min(matchingSkills.length * 10, 30);

      return {
        candidate,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ candidate }) => candidate);
}

async function rankLiveCandidates(
  profile: ScoutProfile,
  onProgress?: (progress: ScoutProgress) => void,
): Promise<RankedScoutMatch[]> {
  emit(onProgress, {
    stage: "searching",
    message: "Searching a focused set of opportunity sources…",
  });

  // ─────────────────────────────
  // SEARCH
  // ─────────────────────────────
  const searchStarted = Date.now();
  console.log("[scout] search:start");

  const searchResults = await searchAllQueries(buildSearchQueries(profile));

  console.log("[scout] search:done", `${Date.now() - searchStarted}ms`);

  emit(onProgress, {
    stage: "sources_found",
    message: searchResults.length
      ? `Found ${searchResults.length} promising sources. Reading the details…`
      : "No live sources responded.",
    count: searchResults.length,
  });

  if (!searchResults.length) {
    return [];
  }

  // ─────────────────────────────
  // SCRAPE
  // ─────────────────────────────
  emit(onProgress, {
    stage: "extracting",
    message: "Reading opportunity details…",
  });

  const scrapeStarted = Date.now();

  console.log("[scout] scrape:start");

  const scrapeResults = await scrapeAll(
    searchResults.slice(0, MAX_SCRAPE_URLS).map((result) => result.url),
  );

  console.log("[scout] scrape:done", `${Date.now() - scrapeStarted}ms`);

  const successfulScrapes = scrapeResults.filter(
    (result): result is ScrapeSuccess => result.ok,
  );

  console.log(
    `[scout] scrape:successful ${successfulScrapes.length}/${scrapeResults.length}`,
  );

  // ─────────────────────────────
  // AI EXTRACTION
  // Only extraction uses AI
  // ─────────────────────────────
  const extractionStarted = Date.now();

  // Keep this LOW because Gemini/OpenRouter can be slow.
  const scrapeCandidates = successfulScrapes.slice(0, 3);

  console.log(
    `[scout] extraction:start (${scrapeCandidates.length} candidates)`,
  );

  const extractionResults = await runWithConcurrency(
    scrapeCandidates,
    EXTRACTION_CONCURRENCY,
    (result) =>
      extractWithRetry({
        url: result.url,
        markdown: result.markdown,
      }),
  );

  console.log("[scout] extraction:done", `${Date.now() - extractionStarted}ms`);

  // ─────────────────────────────
  // BUILD CANDIDATES
  // ─────────────────────────────
  const liveCandidates: ScoutCandidate[] = extractionResults.flatMap(
    (result, index) =>
      result.status === "fulfilled"
        ? [
            {
              ...result.value,
              candidateId: `live:${index}:${result.value.sourceUrl}`,
              source: "live" as const,
            },
          ]
        : [],
  );

  const resultByUrl = new Map(searchResults.map((result) => [result.url, result]));
  const socialCandidates: ScoutCandidate[] = scrapeResults.flatMap(
    (scrape, index) => {
      if (scrape.ok || !isSocialUrl(scrape.url)) return [];

      const searchResult = resultByUrl.get(scrape.url);
      if (!searchResult) return [];

      return [
        {
          candidateId: `social:${index}:${searchResult.url}`,
          source: "live" as const,
          title: searchResult.title,
          type: socialCandidateType(
            profile,
            searchResult.title,
            searchResult.snippet,
          ),
          sourceUrl: searchResult.url,
          organization: null,
          description: searchResult.snippet || null,
          eligibility: {
            educationLevel: null,
            experience: null,
            location: null,
            remoteOk: null,
            otherCriteria: null,
          },
          requiredSkills: [],
          location: null,
          isRemote: null,
          deadline: null,
          experienceLevel: null,
          stipend: null,
          confidence: "medium" as const,
        },
      ];
    },
  );

  const viableCandidates = [...liveCandidates, ...socialCandidates].filter(
    (candidate) => candidate.confidence !== "low",
  );

  console.log(`[scout] viable-candidates: ${viableCandidates.length}`);

  if (!viableCandidates.length) {
    return [];
  }

  // ─────────────────────────────
  // DETERMINISTIC RANKING
  // NO AI REQUEST HERE
  // ─────────────────────────────

  const preRankedCandidates = preRankCandidates(profile, viableCandidates);

  console.log(
    `[scout] pre-ranking: ${viableCandidates.length} → ${preRankedCandidates.length}`,
  );

  emit(onProgress, {
    stage: "checking_eligibility",
    message: "Checking opportunities against your profile…",
  });

  emit(onProgress, {
    stage: "ranking",
    message: "Finding your strongest matches…",
  });

  const matches: RankedScoutMatch[] = preRankedCandidates
    .map((candidate, index) => ({
      candidateId: candidate.candidateId,
      score: Math.max(100 - index * 10, 70),
      matchReason:
        "Matches your profile based on eligibility, skills, experience level, and availability.",
      opportunity: candidate,
    }))
    .slice(0, 5);

  console.log(`[scout] ranking:done (deterministic) ${matches.length} matches`);

  return matches;
}

async function persistScoutResults(
  profileId: string,
  userId: string,
  matches: RankedScoutMatch[],
): Promise<RankedScoutMatch[]> {
  console.log("[scout] persistence:start");

  const saved = await Promise.allSettled(
    matches.map(async (match) => ({
      ...match,
      opportunity:
        match.opportunity.source === "live"
          ? await persistLiveCandidate(match.opportunity, userId)
          : match.opportunity,
    })),
  );

  const persisted = saved.flatMap((entry) => {
    if (entry.status === "fulfilled") {
      return [entry.value];
    }

    console.error("[scout] persistence failed:", entry.reason);
    return [];
  });

  console.log(
    `[scout] persistence: ${persisted.length}/${matches.length} opportunities persisted`,
  );

  if (persisted.length) {
    await persistMatches(profileId, persisted);
  }

  console.log("[scout] persistence:done");

  return persisted;
}

export async function runScoutPipeline({
  userId,
  onProgress,
  onResult,
}: RunScoutPipelineOptions): Promise<ScoutPipelineResult> {
  const started = Date.now();

  console.log("[scout] pipeline:start");

  const profile = await getScoutProfile(userId);

  let matches = await rankLiveCandidates(profile, onProgress);

  console.log("[scout] rank-live-candidates:done", `${Date.now() - started}ms`);

  const usedFallback = matches.length < MIN_VIABLE_RESULTS;

  if (usedFallback) {
    emit(onProgress, {
      stage: "checking_eligibility",
      message: "Adding relevant opportunities from the saved pool…",
    });

    const fallback = await getPreFetchedFallback(profile);

    if (fallback.length) {
      const fallbackCandidates = preRankCandidates(profile, fallback);

      const fallbackMatches: RankedScoutMatch[] = fallbackCandidates
        .map((candidate, index) => ({
          candidateId: candidate.candidateId,
          score: Math.max(90 - index * 10, 60),
          matchReason:
            "Matches your profile based on eligibility, skills, experience level, and availability.",
          opportunity: candidate,
        }))
        .slice(0, 5);

      const unique = new Map(
        matches.map((match) => [match.opportunity.sourceUrl, match]),
      );

      for (const match of fallbackMatches) {
        if (!unique.has(match.opportunity.sourceUrl)) {
          unique.set(match.opportunity.sourceUrl, match);
        }
      }

      matches = [...unique.values()]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    }
  }

  const result: ScoutPipelineResult = {
    matches,
    usedFallback,
  };

  onResult?.(result);

  // Stream the usable results first; persistence should not hide them when a
  // database write is temporarily unavailable.
  await persistScoutResults(profile.id, userId, matches).catch(
    (error: unknown) => console.error("Unable to persist scout matches:", error),
  );

  emit(onProgress, {
    stage: "done",
    message: matches.length
      ? `Your ${matches.length} strongest matches are ready.`
      : "Try refining your interests and run another scout.",
    count: matches.length,
  });

  console.log("[scout] pipeline:done", `${Date.now() - started}ms`);

  return result;
}

export async function runGuestScoutPipeline(
  options: PipelineOptions,
): Promise<ScoutPipelineResult> {
  const started = Date.now();

  console.log("[scout] guest-pipeline:start");

  const matches = await rankLiveCandidates(options.profile, options.onProgress);

  emit(options.onProgress, {
    stage: "done",
    message: matches.length
      ? `Your ${matches.length} strongest matches are ready.`
      : "Try refining your interests and run another scout.",
    count: matches.length,
  });

  console.log("[scout] guest-pipeline:done", `${Date.now() - started}ms`);

  return {
    matches,
    usedFallback: false,
  };
}
