import { splitIntoSentences, tokenize } from "../utils/tokenizer";

export interface BayesSegOptions {
  maxSegments?: number;
  minSegmentLength?: number;
}

function sentenceVector(sentence: string): Map<string, number> {
  const tokens = tokenize(sentence.toLowerCase());
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token.value, (freq.get(token.value) ?? 0) + 1);
  }
  return freq;
}

function logLikelihood(sentences: string[], start: number, end: number): number {
  const counts = new Map<string, number>();
  let total = 0;
  for (let i = start; i < end; i++) {
    const vec = sentenceVector(sentences[i]);
    for (const [token, count] of vec.entries()) {
      counts.set(token, (counts.get(token) ?? 0) + count);
      total += count;
    }
  }
  let logProb = 0;
  for (const [, count] of counts.entries()) {
    const p = count / total;
    logProb += count * Math.log(p);
  }
  return logProb;
}

export function bayesSegBoundaries(text: string, options: BayesSegOptions = {}): number[] {
  const { maxSegments = 5, minSegmentLength = 2 } = options;
  const sentences = splitIntoSentences(text);
  if (sentences.length <= 1) return [];

  const dp: number[] = Array(sentences.length + 1).fill(-Infinity);
  const backtrack: number[] = Array(sentences.length + 1).fill(-1);
  dp[0] = 0;

  for (let i = minSegmentLength; i <= sentences.length; i++) {
    for (let j = Math.max(0, i - 20); j <= i - minSegmentLength; j++) {
      const segmentCount = (backtrack[j] === -1 ? 0 : 1) + 1;
      if (segmentCount > maxSegments) continue;
      const score = dp[j] + logLikelihood(sentences.map((s) => s.sentence), j, i);
      if (score > dp[i]) {
        dp[i] = score;
        backtrack[i] = j;
      }
    }
  }

  const boundaries: number[] = [];
  let idx = sentences.length;
  while (idx > 0 && backtrack[idx] !== -1) {
    boundaries.push(sentences[idx - 1].end);
    idx = backtrack[idx];
  }

  return boundaries.reverse();
}
