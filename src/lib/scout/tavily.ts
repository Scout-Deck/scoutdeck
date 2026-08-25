export type SearchResult = {
  url: string;
  title: string;
  snippet: string;
};

type TavilyResponse = {
  results?: Array<{ url?: string; title?: string; content?: string }>;
};

export async function searchTavily(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is not configured.');
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced',
        max_results: 4,
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as TavilyResponse;
    return (payload.results ?? []).flatMap((result) => {
      if (!result.url) return [];
      return [{
        url: result.url,
        title: result.title?.trim() || 'Untitled opportunity',
        snippet: result.content?.trim() || '',
      }];
    });
  } catch {
    return [];
  }
}

export async function searchAllQueries(queries: string[]): Promise<SearchResult[]> {
  const responses = await Promise.all(queries.map(searchTavily));
  const byUrl = new Map<string, SearchResult>();
  for (const result of responses.flat()) {
    if (!byUrl.has(result.url)) byUrl.set(result.url, result);
  }
  return [...byUrl.values()];
}
