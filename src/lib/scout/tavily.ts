import type { SearchIntent } from './query-builder';
import type { OpportunityType } from './types';

export type SearchResult = {
  url: string;
  title: string;
  snippet: string;
  requestedType: OpportunityType;
  lane: SearchIntent['lane'];
};
const SEARCH_TIMEOUT_MS = 12_000;

type TavilyResponse = {
  results?: Array<{ url?: string; title?: string; content?: string }>;
};

function canonicalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith('utm_') || key === 'ref' || key === 'source') url.searchParams.delete(key);
    }
    url.hash = '';
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/$/, '');
    return url.toString();
  } catch {
    return null;
  }
}

export async function searchTavily(intent: SearchIntent): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is not configured.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: intent.query,
        search_depth: 'advanced',
        max_results: 5,
        include_answer: false,
        include_raw_content: false,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as TavilyResponse;
    return (payload.results ?? []).flatMap((result) => {
      const url = result.url ? canonicalUrl(result.url) : null;
      if (!url) return [];
      return [{
        url,
        title: result.title?.trim() || 'Untitled opportunity',
        snippet: result.content?.trim() || '',
        requestedType: intent.type,
        lane: intent.lane,
      }];
    });
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchAllQueries(intents: SearchIntent[]): Promise<SearchResult[]> {
  const responses = await Promise.all(intents.map(searchTavily));
  const byUrl = new Map<string, SearchResult>();
  for (const result of responses.flat()) {
    if (!byUrl.has(result.url)) byUrl.set(result.url, result);
  }
  return [...byUrl.values()];
}
