import { extractOpportunity, rankCandidates } from './ai';
import { runWithConcurrency } from './concurrency';
import { scrapeAll, type ScrapeSuccess } from './firecrawl';
import { buildSearchQueries } from './query-builder';
import { getPreFetchedFallback, getScoutProfile, persistLiveCandidate, persistMatches } from './supabase';
import { searchAllQueries, MAX_SEARCH_TARGETS } from './tavily';
import type { OpportunityType, RankedScoutMatch, ScoutCandidate, ScoutProfile, ScoutProgress } from './types';

const SOCIAL_HOSTS = new Set([
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'threads.net',
  'tiktok.com',
  'twitter.com',
  'x.com',
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

function emit(onProgress: PipelineOptions['onProgress'], progress: ScoutProgress) {
  onProgress?.(progress);
}

function isSocialUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return [...SOCIAL_HOSTS].some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function socialCandidateType(profile: ScoutProfile, title: string, snippet: string): OpportunityType {
  const text = `${title} ${snippet}`.toLowerCase();
  const matchingType = profile.opportunityTypes.find((type) => text.includes(type.replace('_', ' ')));
  return matchingType ?? profile.opportunityTypes[0] ?? 'fellowship';
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

async function rankLiveCandidates(profile: ScoutProfile, onProgress?: (progress: ScoutProgress) => void): Promise<RankedScoutMatch[]> {
  emit(onProgress, { stage: 'searching', message: 'Searching a focused set of opportunity sources…' });
  const searchResults = await searchAllQueries(buildSearchQueries(profile));
  emit(onProgress, {
    stage: 'sources_found',
    message: searchResults.length ? `Found ${searchResults.length} promising sources. Reading the details…` : 'No live sources responded. Checking the saved opportunity pool…',
    count: searchResults.length,
  });

  emit(onProgress, { stage: 'extracting', message: 'Extracting eligibility, deadlines, and requirements…' });
  const scrapeResults = await scrapeAll(searchResults.slice(0, MAX_SCRAPE_URLS).map((result) => result.url));
  const successfulScrapes = scrapeResults.filter((result): result is ScrapeSuccess => result.ok);
  const extractionResults = await runWithConcurrency(
    successfulScrapes,
    EXTRACTION_CONCURRENCY,
    (result) => extractWithRetry({ url: result.url, markdown: result.markdown }),
  );
  const liveCandidates: ScoutCandidate[] = extractionResults.flatMap((result, index) => result.status === 'fulfilled'
    ? [{ ...result.value, candidateId: `live:${index}:${result.value.sourceUrl}`, source: 'live' as const }]
    : []);
  const resultByUrl = new Map(searchResults.map((result) => [result.url, result]));
  const socialCandidates: ScoutCandidate[] = scrapeResults.flatMap((scrape, index) => {
    if (scrape.ok || !isSocialUrl(scrape.url)) return [];
    const searchResult = resultByUrl.get(scrape.url);
    if (!searchResult) return [];
    return [{
      candidateId: `social:${index}:${searchResult.url}`,
      source: 'live' as const,
      title: searchResult.title,
      type: socialCandidateType(profile, searchResult.title, searchResult.snippet),
      sourceUrl: searchResult.url,
      organization: null,
      description: searchResult.snippet || null,
      eligibility: { educationLevel: null, experience: null, location: null, remoteOk: null, otherCriteria: null },
      requiredSkills: [],
      location: null,
      isRemote: null,
      deadline: null,
      experienceLevel: null,
      stipend: null,
      confidence: 'medium' as const,
    }];
  });
  const viableCandidates = [...liveCandidates, ...socialCandidates].filter((candidate) => candidate.confidence !== 'low');

  if (!viableCandidates.length) return [];

  emit(onProgress, { stage: 'checking_eligibility', message: 'Checking each opportunity against your profile…' });
  emit(onProgress, { stage: 'ranking', message: 'Ranking your strongest matches…' });
  const rankingPool = viableCandidates.map((candidate, index) => ({ ...candidate, candidateId: `c${index}` }));
  const candidateById = new Map(rankingPool.map((candidate) => [candidate.candidateId, candidate]));
  const ranking = await rankCandidates(profile, rankingPool);
  return ranking.matches.flatMap((match) => {
    const opportunity = candidateById.get(match.candidateId);
    return opportunity ? [{ ...match, score: Math.round(match.score), opportunity }] : [];
  }).slice(0, 5);
}

async function rankFallbackCandidates(profile: ScoutProfile, fallback: ScoutCandidate[]) {
  const rankingPool = fallback.map((candidate, index) => ({ ...candidate, candidateId: `fallback:${index}` }));
  const candidateById = new Map(rankingPool.map((candidate) => [candidate.candidateId, candidate]));
  const ranking = await rankCandidates(profile, rankingPool);
  return ranking.matches.flatMap((match) => {
    const opportunity = candidateById.get(match.candidateId);
    return opportunity ? [{ ...match, score: Math.round(match.score), opportunity }] : [];
  });
}

export async function runGuestScoutPipeline(options: PipelineOptions): Promise<ScoutPipelineResult> {
  const matches = await rankLiveCandidates(options.profile, options.onProgress);
  emit(options.onProgress, { stage: 'done', message: matches.length ? `Your ${matches.length} strongest matches are ready.` : 'Try refining your interests and run another scout.', count: matches.length });
  return { matches, usedFallback: false };
}

export async function runScoutPipeline({ userId, onProgress, onResult }: RunScoutPipelineOptions): Promise<ScoutPipelineResult> {
  const profile = await getScoutProfile(userId);
  let matches = await rankLiveCandidates(profile, onProgress);
  const usedFallback = matches.length < MIN_VIABLE_RESULTS;

  if (usedFallback) {
    emit(onProgress, { stage: 'checking_eligibility', message: 'Adding relevant opportunities from the saved pool…' });
    const fallback = await getPreFetchedFallback(profile);
    if (fallback.length) {
      emit(onProgress, { stage: 'ranking', message: 'Ranking your strongest matches…' });
      const fallbackMatches = await rankFallbackCandidates(profile, fallback);
      const unique = new Map(matches.map((match) => [match.opportunity.sourceUrl, match]));
      fallbackMatches.forEach((match) => unique.set(match.opportunity.sourceUrl, match));
      matches = [...unique.values()].sort((a, b) => b.score - a.score).slice(0, 5);
    }
  }

  const result = { matches, usedFallback };
  // The route forwards this result to the browser before persistence begins,
  // while the request remains open long enough for the normal database write.
  onResult?.(result);
  const saved = await Promise.allSettled(matches.map(async (match) => ({
    ...match,
    opportunity: match.opportunity.source === 'live' ? await persistLiveCandidate(match.opportunity, userId) : match.opportunity,
  })));
  const persisted = saved.flatMap((entry) => entry.status === 'fulfilled' ? [entry.value] : []);
  await persistMatches(profile.id, persisted).catch((error: unknown) => console.error('Unable to persist scout matches:', error));

  emit(onProgress, { stage: 'done', message: matches.length ? `Your ${matches.length} strongest matches are ready.` : 'Try refining your profile and run another scout.', count: matches.length });
  return result;
}
