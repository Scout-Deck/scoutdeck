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
  RankedScoutMatch,
  
  ScoutCandidate,
  ScoutProfile,
  ScoutProgress,
} from "./types";

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

  if (!successfulScrapes.length) {
    return [];
  }

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
      extractOpportunity({
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

  const viableCandidates = liveCandidates.filter(
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
) {
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

  const persisted = saved.flatMap((entry) =>
    entry.status === "fulfilled" ? [entry.value] : [],
  );

  if (persisted.length) {
    await persistMatches(profileId, persisted);
  }

  console.log("[scout] persistence:done");
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

  console.log(
    "[scout] rank-live-candidates:done",
    `${Date.now() - started}ms`,
  );

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

  // Send results to the route immediately.
  onResult?.(result);

  // Persistence does NOT block the scout response.
  void persistScoutResults(profile.id, userId, matches).catch((error) => {
    console.error("[scout] background persistence failed:", error);
  });

  emit(onProgress, {
    stage: "done",
    message: matches.length
      ? `Your ${matches.length} strongest matches are ready.`
      : "Try refining your interests and run another scout.",
    count: matches.length,
  });

  console.log(
    "[scout] pipeline:done",
    `${Date.now() - started}ms`,
  );

  return result;
}

export async function runGuestScoutPipeline(
  options: PipelineOptions,
): Promise<ScoutPipelineResult> {
  const started = Date.now();

  console.log("[scout] guest-pipeline:start");

  const matches = await rankLiveCandidates(
    options.profile,
    options.onProgress,
  );

  emit(options.onProgress, {
    stage: "done",
    message: matches.length
      ? `Your ${matches.length} strongest matches are ready.`
      : "Try refining your interests and run another scout.",
    count: matches.length,
  });

  console.log(
    "[scout] guest-pipeline:done",
    `${Date.now() - started}ms`,
  );

  return {
    matches,
    usedFallback: false,
  };
}