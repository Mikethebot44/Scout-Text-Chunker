import { movingAverage, normalize } from "../utils/smoothing";
import { splitIntoSentences, tokenize } from "../utils/tokenizer";

export interface TextTilingOptions {
  blockSize?: number;
  smoothingWindow?: number;
  depthThreshold?: number;
}

export function textTilingBoundaries(text: string, options: TextTilingOptions = {}): number[] {
  const { blockSize = 6, smoothingWindow = 4, depthThreshold = 0.1 } = options;
  const sentences = splitIntoSentences(text);
  if (sentences.length <= 1) return [];

  const lexicalScores: number[] = [];
  for (let i = 0; i < sentences.length - 1; i++) {
    const leftTokens = tokenize(sentences[Math.max(0, i - blockSize + 1)].sentence).map((token) => token.value.toLowerCase());
    const rightTokens = tokenize(sentences[Math.min(sentences.length - 1, i + blockSize)].sentence).map((token) => token.value.toLowerCase());
    const overlap = leftTokens.filter((token) => rightTokens.includes(token)).length;
    const score = overlap / Math.max(1, Math.sqrt(leftTokens.length * rightTokens.length));
    lexicalScores.push(score);
  }

  const smoothed = movingAverage(lexicalScores, smoothingWindow);
  const normalized = normalize(smoothed);

  const boundaries: number[] = [];
  for (let i = 1; i < normalized.length - 1; i++) {
    const depth = normalized[i - 1] - normalized[i] + (normalized[i + 1] - normalized[i]);
    if (depth > depthThreshold && normalized[i] < normalized[i - 1] && normalized[i] < normalized[i + 1]) {
      boundaries.push(sentences[i].end);
    }
  }
  return boundaries;
}
