export function movingAverage(values: number[], window: number): number[] {
  if (window <= 1) return [...values];
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(values.length, i + Math.ceil(window / 2));
    const slice = values.slice(start, end);
    const average = slice.reduce((sum, value) => sum + value, 0) / slice.length;
    result.push(average);
  }
  return result;
}

export function normalize(values: number[]): number[] {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0);
  return values.map((value) => (value - min) / (max - min));
}
