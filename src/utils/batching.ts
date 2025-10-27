export async function batchProcess<T, R>(items: T[], size: number, handler: (batch: T[]) => Promise<R[]>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    const batchResults = await handler(batch);
    results.push(...batchResults);
  }
  return results;
}

export async function concurrentMap<T, R>(items: T[], concurrency: number, handler: (item: T) => Promise<R>): Promise<R[]> {
  const result: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (true) {
      const current = index++;
      if (current >= items.length) break;
      result[current] = await handler(items[current]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return result;
}
