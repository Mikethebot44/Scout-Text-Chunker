export function dot(a: number[], b: number[]): number {
  return a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0);
}

export function magnitude(vec: number[]): number {
  return Math.sqrt(vec.reduce((sum, value) => sum + value * value, 0));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const denom = magnitude(a) * magnitude(b);
  if (denom === 0) return 0;
  return dot(a, b) / denom;
}

export function pairwiseCosine(vectors: number[][]): number[] {
  const sims: number[] = [];
  for (let i = 0; i < vectors.length - 1; i++) {
    sims.push(cosineSimilarity(vectors[i], vectors[i + 1]));
  }
  return sims;
}
