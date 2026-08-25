import { extractOpportunity, rankCandidates } from './ai';
import { scrapeAll } from './firecrawl';
import { buildSearchQueries } from './query-builder';
import { getPreFetchedFallback, getScoutProfile, persistLiveCandidate, persistMatches } from './supabase';
import { searchAllQueries } from './tavily';
import type { RankedScoutMatch, ScoutCandidate, ScoutProgress } from './types';

export const MIN_VIABLE_RESULTS = 5;
const MAX_SCRAPE_URLS = 12;

type RunScoutPipelineOptions = {
  userId: string;
  onProgress?: (progress: ScoutProgress) => void;
};

export type ScoutPipelineResult = {
  matches: RankedScoutMatch[];
  usedFallback: boolean;
};

function emit(onProgress: RunScoutPipelineOptions['onProgress'], progress: ScoutProgress) {
  onProgress?.(progress);
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

export async function runScoutPipeline({ userId, onProgress }: RunScoutPipelineOptions): Promise<ScoutPipelineResult> {
  const profile = await getScoutProfile(userId);
  emit(onProgress, { stage: 'searching', message: 'Searching the web for opportunities…' });

  const searchResults = await searchAllQueries(buildSearchQueries(profile));
  emit(onProgress, {
    stage: 'sources_found',
    message: `Found ${searchResults.length} sources. Extracting the useful details…`,
    count: searchResults.length,
  });

  emit(onProgress, { stage: 'extracting', message: 'Extracting eligibility, deadlines, and requirements…' });
  const scrapeResults = await scrapeAll(searchResults.slice(0, MAX_SCRAPE_URLS).map((result) => result.url));
  const extractionResults = await Promise.allSettled(scrapeResults.flatMap((result) => result.ok ? [
    extractWithRetry({ url: result.url, markdown: result.markdown }),
  ] : []));

  const liveCandidates: ScoutCandidate[] = extractionResults.flatMap((result, index) => {
    if (result.status !== 'fulfilled') return [];
    return [{ ...result.value, candidateId: `live:${index}:${result.value.sourceUrl}`, source: 'live' as const }];
  });
  const viableLiveResults = liveCandidates.filter((candidate) => candidate.confidence !== 'low');

  emit(onProgress, { stage: 'checking_eligibility', message: 'Checking each opportunity against your profile…' });
  const usedFallback = viableLiveResults.length < MIN_VIABLE_RESULTS;
  const fallback = usedFallback ? await getPreFetchedFallback(profile) : [];
  const candidatesByUrl = new Map<string, ScoutCandidate>();
  for (const candidate of [...viableLiveResults, ...fallback]) {
    if (!candidatesByUrl.has(candidate.sourceUrl)) candidatesByUrl.set(candidate.sourceUrl, candidate);
  }
  const candidates = [...candidatesByUrl.values()];

  if (candidates.length === 0) {
    emit(onProgress, { stage: 'done', message: 'We could not find strong opportunities for this profile yet.', count: 0 });
    return { matches: [], usedFallback };
  }

  emit(onProgress, { stage: 'ranking', message: 'Ranking your strongest matches…' });
  const ranking = await rankCandidates(profile, candidates);
  const candidatesById = new Map(candidates.map((candidate) => [candidate.candidateId, candidate]));
  const ranked = ranking.matches.flatMap((match) => {
    const opportunity = candidatesById.get(match.candidateId);
    return opportunity ? [{ ...match, score: Math.round(match.score), opportunity }] : [];
  }).slice(0, 5);

  const persistenceResults = await Promise.allSettled(ranked.map(async (match) => ({
    ...match,
    opportunity: match.opportunity.source === 'live'
      ? await persistLiveCandidate(match.opportunity, userId)
      : match.opportunity,
  })));
  const persistedCandidates = persistenceResults.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
  // Storage is useful for later browsing, but a transient database failure should
  // never hide the results we already found and ranked for the user.
  await persistMatches(profile.id, persistedCandidates).catch((error: unknown) => {
    console.error('Unable to persist scout matches:', error);
  });

  emit(onProgress, { stage: 'done', message: `Your ${ranked.length} strongest matches are ready.`, count: ranked.length });
  return { matches: ranked, usedFallback };
}
