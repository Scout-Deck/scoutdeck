export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
  delayMs = 0
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;

  async function runNext(): Promise<void> {
    const index = cursor++;
    if (index >= items.length) return;
    try {
      results[index] = { status: 'fulfilled', value: await worker(items[index]) };
    } catch (error) {
      results[index] = { status: 'rejected', reason: error };
    }
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    return runNext();
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runNext));
  return results;
}