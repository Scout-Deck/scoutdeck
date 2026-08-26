import { extractOpportunity, rankCandidates } from './ai';
import { scrapeAll } from './firecrawl';
import { buildSearchQueries } from './query-builder';
import { getPreFetchedFallback, getScoutProfile, persistLiveCandidate, persistMatches } from './supabase';
import { searchAllQueries } from './tavily';
import type { RankedScoutMatch, ScoutCandidate, ScoutProgress } from './types';

export const MIN_VIABLE_RESULTS = 5;
const MAX_SCRAPE_URLS = 12;
const MAX_EXTRACTION_URLS = 8;

type RunScoutPipelineOptions = {
  userId: string;
  onProgress?: (progress: ScoutProgress) => void;
};

export type ScoutPipelineResult = {
  matches: RankedScoutMatch[];
  usedFallback: boolean;
};

export class ScoutProfileRequiredError extends Error {}

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
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
  throw lastError;
}

function sourceQuality(result: { url: string; title: string; snippet: string }): number {
  const text = `${result.title} ${result.snippet}`.toLowerCase();
  let score = 0;
  if (/apply|application|registration|deadline|open call|cohort/.test(text)) score += 4;
  if (/\b202[6-9]\b/.test(text)) score += 2;
  if (/closed|archived|202[0-5]/.test(text)) score -= 6;
  if (/youtube\.com|instagram\.com|facebook\.com/.test(result.url)) score -= 5;
  return score;
}

function selectSourcesForScraping(results: Awaited<ReturnType<typeof searchAllQueries>>): string[] {
  const sorted = [...results].sort((a, b) => sourceQuality(b) - sourceQuality(a));
  const selected: typeof sorted = [];
  const selectedUrls = new Set<string>();
  const selectedDomains = new Set<string>();
  const types = [...new Set(sorted.map((result) => result.requestedType))];

  for (const type of types) {
    for (const result of sorted.filter((item) => item.requestedType === type)) {
      const domain = new URL(result.url).hostname;
      if (selectedUrls.has(result.url) || selectedDomains.has(domain)) continue;
      selected.push(result);
      selectedUrls.add(result.url);
      selectedDomains.add(domain);
      break;
    }
  }
  for (const result of sorted) {
    if (selected.length >= MAX_SCRAPE_URLS) break;
    if (selectedUrls.has(result.url)) continue;
    selected.push(result);
    selectedUrls.add(result.url);
  }
  return selected.map((result) => result.url);
}

function isClearlyExpired(deadline: string | null): boolean {
  if (!deadline) return false;
  const timestamp = Date.parse(deadline);
  return Number.isFinite(timestamp) && timestamp < Date.now() - 24 * 60 * 60 * 1_000;
}

export async function runScoutPipeline({ userId, onProgress }: RunScoutPipelineOptions): Promise<ScoutPipelineResult> {
  const profile = await getScoutProfile(userId);
  const hasSearchFocus = Boolean(profile.fieldOfStudy.trim() || profile.interests.trim() || profile.skills.some((skill) => skill.trim()));
  if (profile.opportunityTypes.length === 0 || !hasSearchFocus) {
    throw new ScoutProfileRequiredError('Add your interests or field of study and choose at least one opportunity type before scouting.');
  }
  emit(onProgress, { stage: 'searching', message: 'Searching the web for opportunities…' });

  const searchResults = await searchAllQueries(buildSearchQueries(profile));
  emit(onProgress, {
    stage: 'sources_found',
    message: `Found ${searchResults.length} sources. Extracting the useful details…`,
    count: searchResults.length,
  });

  emit(onProgress, { stage: 'extracting', message: 'Extracting eligibility, deadlines, and requirements…' });
  const scrapeResults = await scrapeAll(selectSourcesForScraping(searchResults));
  const extractionInputs = scrapeResults.flatMap((result) => result.ok ? [{ url: result.url, markdown: result.markdown }] : []).slice(0, MAX_EXTRACTION_URLS);
  const extractionResults: PromiseSettledResult<Awaited<ReturnType<typeof extractOpportunity>>>[] = [];
  for (let index = 0; index < extractionInputs.length; index += 2) {
    extractionResults.push(...await Promise.allSettled(extractionInputs.slice(index, index + 2).map(extractWithRetry)));
  }

  const liveCandidates: ScoutCandidate[] = extractionResults.flatMap((result, index) => {
    if (result.status !== 'fulfilled') return [];
    return [{ ...result.value, candidateId: `live:${index}:${result.value.sourceUrl}`, source: 'live' as const }];
  });
  const desiredTypes = new Set(profile.opportunityTypes.length > 0 ? profile.opportunityTypes : ['hackathon', 'fellowship', 'builder_program']);
  const viableLiveResults = liveCandidates.filter((candidate) => (
    candidate.confidence !== 'low'
    && candidate.applicationStatus !== 'closed'
    && !isClearlyExpired(candidate.deadline)
    && desiredTypes.has(candidate.type)
  ));

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
