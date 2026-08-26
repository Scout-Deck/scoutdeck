export type ScrapeSuccess = {
  ok: true;
  url: string;
  markdown: string;
  title?: string;
};

export type ScrapeFailure = {
  ok: false;
  url: string;
  error: string;
};

export type ScrapeResult = ScrapeSuccess | ScrapeFailure;

type FirecrawlResponse = {
  success?: boolean;
  data?: { markdown?: string; metadata?: { title?: string } };
  error?: string;
};

const SCRAPE_TIMEOUT_MS = 10_000;

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return { ok: false, url, error: 'Firecrawl is not configured.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, formats: ['markdown'] }),
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as FirecrawlResponse | null;
    const markdown = payload?.data?.markdown?.trim();

    if (!response.ok || !payload?.success || !markdown) {
      return { ok: false, url, error: payload?.error || 'No readable page content.' };
    }

    return { ok: true, url, markdown, title: payload.data?.metadata?.title };
  } catch (error) {
    return {
      ok: false,
      url,
      error: error instanceof Error && error.name === 'AbortError'
        ? 'Scrape timed out.'
        : 'Scrape failed.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function scrapeAll(urls: string[]): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = new Array(urls.length);
  let nextIndex = 0;
  const workerCount = Math.min(4, urls.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < urls.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = await scrapeUrl(urls[index]);
      } catch {
        results[index] = { ok: false, url: urls[index], error: 'Scrape failed.' };
      }
    }
  }));
  return results;
}
