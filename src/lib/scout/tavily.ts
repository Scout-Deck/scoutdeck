export type SearchResult = {
  url: string;
  title: string;
  snippet: string;
};
const SEARCH_TIMEOUT_MS = 15_000;
const MAX_RESULTS_PER_QUERY = 2;
const MAX_SEARCH_QUERIES = 3;
export const MAX_SEARCH_TARGETS = 6;

type TavilyResponse = {
  results?: Array<{ url?: string; title?: string; content?: string }>;
};

export async function searchTavily(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return [];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "advanced",
        max_results: MAX_RESULTS_PER_QUERY,
        include_answer: false,
        include_raw_content: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as TavilyResponse;
    return (payload.results ?? []).flatMap((result) => {
      if (!result.url) return [];
      return [
        {
          url: result.url,
          title: result.title?.trim() || "Untitled opportunity",
          snippet: result.content?.trim() || "",
        },
      ];
    });
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchAllQueries(
  queries: string[],
): Promise<SearchResult[]> {
  const responses = await Promise.all(
    queries.slice(0, MAX_SEARCH_QUERIES).map(searchTavily),
  );
  const byUrl = new Map<string, SearchResult>();
  for (const result of responses.flat()) {
    if (!byUrl.has(result.url)) byUrl.set(result.url, result);
  }
  return [...byUrl.values()].slice(0, MAX_SEARCH_TARGETS);
}
