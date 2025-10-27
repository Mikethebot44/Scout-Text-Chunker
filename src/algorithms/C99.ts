import { cosineSimilarity } from "../utils/cosine";
import { splitIntoSentences } from "../utils/tokenizer";
import type { Embedder } from "../types";

export interface C99Options {
  window?: number;
  smoothingWindow?: number;
}

export async function c99Boundaries(text: string, embedder: Embedder, options: C99Options = {}): Promise<number[]> {
  const { window = 5 } = options;
  const sentences = splitIntoSentences(text);
  if (sentences.length <= 1) return [];
  const vectors = await embedder.embed(sentences.map((s) => s.sentence));
  const matrix: number[][] = Array.from({ length: vectors.length }, (_, i) =>
    vectors.map((vec) => cosineSimilarity(vec, vectors[i]))
  );

  const boundaries: number[] = [];
  for (let i = window; i < matrix.length - window; i++) {
    let leftVariance = 0;
    let rightVariance = 0;

    for (let j = i - window; j < i; j++) {
      leftVariance += 1 - matrix[i][j];
    }
    for (let j = i; j < i + window; j++) {
      rightVariance += 1 - matrix[i][j];
    }

    const contrast = Math.abs(leftVariance - rightVariance) / window;
    if (contrast > 0.2) {
      boundaries.push(sentences[i].end);
    }
  }

  return boundaries;
}
