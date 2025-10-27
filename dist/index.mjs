// src/chunkers/FixedChunker.ts
import { v4 as uuid } from "uuid";

// src/utils/tokenizer.ts
var SENTENCE_REGEX = /(?<=[.!?])\s+/;
var PARAGRAPH_REGEX = /\n{2,}/;
function tokenize(text) {
  const tokens = [];
  let index = 0;
  for (const part of text.split(/(\s+)/)) {
    if (!part)
      continue;
    const start = index;
    const end = index + part.length;
    tokens.push({ value: part, start, end });
    index = end;
  }
  return tokens.filter((token) => token.value.trim().length > 0);
}
function splitIntoSentences(text) {
  const sentences = [];
  let offset = 0;
  for (const paragraph of text.split(PARAGRAPH_REGEX)) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      offset += paragraph.length + 2;
      continue;
    }
    const fragments = trimmed.split(SENTENCE_REGEX);
    for (const fragment of fragments) {
      const start = text.indexOf(fragment, offset);
      const end = start + fragment.length;
      sentences.push({ sentence: fragment, start, end });
      offset = end;
    }
    offset += 2;
  }
  if (!sentences.length && text.trim()) {
    sentences.push({ sentence: text.trim(), start: 0, end: text.length });
  }
  return sentences;
}
function splitIntoParagraphs(text) {
  const paragraphs = [];
  let cursor = 0;
  for (const segment of text.split(PARAGRAPH_REGEX)) {
    const trimmed = segment.trim();
    if (!trimmed) {
      cursor += segment.length + 2;
      continue;
    }
    const start = text.indexOf(trimmed, cursor);
    const end = start + trimmed.length;
    paragraphs.push({ sentence: trimmed, start, end });
    cursor = end + 2;
  }
  if (!paragraphs.length && text.trim()) {
    paragraphs.push({ sentence: text.trim(), start: 0, end: text.length });
  }
  return paragraphs;
}

// src/chunkers/FixedChunker.ts
var FixedChunker = class {
  constructor(options) {
    this.chunkSize = options.chunkSize ?? 500;
    this.chunkOverlap = options.chunkOverlap ?? Math.floor(this.chunkSize / 10);
  }
  async chunk(text) {
    const tokens = tokenize(text);
    if (!tokens.length)
      return [];
    const chunks = [];
    let startIndex = 0;
    while (startIndex < tokens.length) {
      const endIndex = Math.min(tokens.length, startIndex + this.chunkSize);
      const chunkTokens = tokens.slice(startIndex, endIndex);
      const chunkText = chunkTokens.map((token) => token.value).join(" ").trim();
      const start = chunkTokens[0].start;
      const end = chunkTokens[chunkTokens.length - 1].end;
      chunks.push({ id: uuid(), text: chunkText, start, end });
      if (endIndex === tokens.length)
        break;
      startIndex = Math.max(0, endIndex - this.chunkOverlap);
    }
    return chunks;
  }
};

// src/chunkers/RecursiveChunker.ts
import { v4 as uuid2 } from "uuid";
var RecursiveChunker = class {
  constructor(options) {
    this.chunkSize = options.chunkSize ?? 500;
  }
  async chunk(text) {
    const paragraphs = splitIntoParagraphs(text);
    const chunks = [];
    for (const paragraph of paragraphs) {
      if (this.tokenCount(paragraph.sentence) <= this.chunkSize) {
        chunks.push({ id: uuid2(), text: paragraph.sentence, start: paragraph.start, end: paragraph.end });
      } else {
        chunks.push(...this.splitParagraph(paragraph.sentence, paragraph.start));
      }
    }
    return this.mergeSmallChunks(chunks);
  }
  splitParagraph(paragraph, offset) {
    const sentences = splitIntoSentences(paragraph);
    const chunks = [];
    let current = [];
    let start = offset;
    for (const sentence of sentences) {
      const tentative = [...current, sentence.sentence].join(" ");
      if (this.tokenCount(tentative) > this.chunkSize && current.length) {
        const text = current.join(" ");
        const chunkStart = start;
        const chunkEnd = chunkStart + text.length;
        chunks.push({ id: uuid2(), text, start: chunkStart, end: chunkEnd });
        current = [sentence.sentence];
        start = offset + sentence.start;
      } else {
        if (!current.length) {
          start = offset + sentence.start;
        }
        current.push(sentence.sentence);
      }
    }
    if (current.length) {
      const text = current.join(" ");
      const chunkStart = start;
      const chunkEnd = chunkStart + text.length;
      chunks.push({ id: uuid2(), text, start: chunkStart, end: chunkEnd });
    }
    return chunks.flatMap(
      (chunk) => this.tokenCount(chunk.text) > this.chunkSize ? this.splitTokens(chunk.text, chunk.start) : chunk
    );
  }
  splitTokens(text, offset) {
    const tokens = tokenize(text);
    const chunks = [];
    for (let i = 0; i < tokens.length; i += this.chunkSize) {
      const slice = tokens.slice(i, i + this.chunkSize);
      const chunkText = slice.map((token) => token.value).join(" ");
      const start = offset + slice[0].start;
      const end = offset + slice[slice.length - 1].end;
      chunks.push({ id: uuid2(), text: chunkText, start, end });
    }
    return chunks;
  }
  mergeSmallChunks(chunks) {
    if (!chunks.length)
      return [];
    const merged = [];
    let buffer = chunks[0];
    for (let i = 1; i < chunks.length; i++) {
      const candidate = chunks[i];
      if (this.tokenCount(buffer.text + " " + candidate.text) <= this.chunkSize) {
        buffer = {
          id: buffer.id,
          text: `${buffer.text} ${candidate.text}`.trim(),
          start: buffer.start,
          end: candidate.end
        };
      } else {
        merged.push(buffer);
        buffer = candidate;
      }
    }
    merged.push(buffer);
    return merged;
  }
  tokenCount(text) {
    return tokenize(text).length;
  }
};

// src/chunkers/SemanticChunker.ts
import { v4 as uuid3 } from "uuid";

// src/utils/cosine.ts
function dot(a, b) {
  return a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0);
}
function magnitude(vec) {
  return Math.sqrt(vec.reduce((sum, value) => sum + value * value, 0));
}
function cosineSimilarity(a, b) {
  const denom = magnitude(a) * magnitude(b);
  if (denom === 0)
    return 0;
  return dot(a, b) / denom;
}
function pairwiseCosine(vectors) {
  const sims = [];
  for (let i = 0; i < vectors.length - 1; i++) {
    sims.push(cosineSimilarity(vectors[i], vectors[i + 1]));
  }
  return sims;
}

// src/utils/stats.ts
function mean(values) {
  if (!values.length)
    return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function stdev(values) {
  if (values.length < 2)
    return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}
function percentile(values, percentileValue) {
  if (!values.length)
    return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(percentileValue / 100 * sorted.length));
  return sorted[index];
}
function zScoreThreshold(values, k) {
  const avg = mean(values);
  const deviation = stdev(values);
  return avg - k * deviation;
}

// src/utils/smoothing.ts
function movingAverage(values, window) {
  if (window <= 1)
    return [...values];
  const result = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(values.length, i + Math.ceil(window / 2));
    const slice = values.slice(start, end);
    const average = slice.reduce((sum, value) => sum + value, 0) / slice.length;
    result.push(average);
  }
  return result;
}
function normalize(values) {
  if (!values.length)
    return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min)
    return values.map(() => 0);
  return values.map((value) => (value - min) / (max - min));
}

// src/algorithms/TextTiling.ts
function textTilingBoundaries(text, options = {}) {
  const { blockSize = 6, smoothingWindow = 4, depthThreshold = 0.1 } = options;
  const sentences = splitIntoSentences(text);
  if (sentences.length <= 1)
    return [];
  const lexicalScores = [];
  for (let i = 0; i < sentences.length - 1; i++) {
    const leftTokens = tokenize(sentences[Math.max(0, i - blockSize + 1)].sentence).map((token) => token.value.toLowerCase());
    const rightTokens = tokenize(sentences[Math.min(sentences.length - 1, i + blockSize)].sentence).map((token) => token.value.toLowerCase());
    const overlap = leftTokens.filter((token) => rightTokens.includes(token)).length;
    const score = overlap / Math.max(1, Math.sqrt(leftTokens.length * rightTokens.length));
    lexicalScores.push(score);
  }
  const smoothed = movingAverage(lexicalScores, smoothingWindow);
  const normalized = normalize(smoothed);
  const boundaries = [];
  for (let i = 1; i < normalized.length - 1; i++) {
    const depth = normalized[i - 1] - normalized[i] + (normalized[i + 1] - normalized[i]);
    if (depth > depthThreshold && normalized[i] < normalized[i - 1] && normalized[i] < normalized[i + 1]) {
      boundaries.push(sentences[i].end);
    }
  }
  return boundaries;
}

// src/algorithms/C99.ts
async function c99Boundaries(text, embedder, options = {}) {
  const { window = 5 } = options;
  const sentences = splitIntoSentences(text);
  if (sentences.length <= 1)
    return [];
  const vectors = await embedder.embed(sentences.map((s) => s.sentence));
  const matrix = Array.from(
    { length: vectors.length },
    (_, i) => vectors.map((vec) => cosineSimilarity(vec, vectors[i]))
  );
  const boundaries = [];
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

// src/algorithms/BayesSeg.ts
function sentenceVector(sentence) {
  const tokens = tokenize(sentence.toLowerCase());
  const freq = /* @__PURE__ */ new Map();
  for (const token of tokens) {
    freq.set(token.value, (freq.get(token.value) ?? 0) + 1);
  }
  return freq;
}
function logLikelihood(sentences, start, end) {
  const counts = /* @__PURE__ */ new Map();
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
function bayesSegBoundaries(text, options = {}) {
  const { maxSegments = 5, minSegmentLength = 2 } = options;
  const sentences = splitIntoSentences(text);
  if (sentences.length <= 1)
    return [];
  const dp = Array(sentences.length + 1).fill(-Infinity);
  const backtrack = Array(sentences.length + 1).fill(-1);
  dp[0] = 0;
  for (let i = minSegmentLength; i <= sentences.length; i++) {
    for (let j = Math.max(0, i - 20); j <= i - minSegmentLength; j++) {
      const segmentCount = (backtrack[j] === -1 ? 0 : 1) + 1;
      if (segmentCount > maxSegments)
        continue;
      const score = dp[j] + logLikelihood(sentences.map((s) => s.sentence), j, i);
      if (score > dp[i]) {
        dp[i] = score;
        backtrack[i] = j;
      }
    }
  }
  const boundaries = [];
  let idx = sentences.length;
  while (idx > 0 && backtrack[idx] !== -1) {
    boundaries.push(sentences[idx - 1].end);
    idx = backtrack[idx];
  }
  return boundaries.reverse();
}

// src/chunkers/SemanticChunker.ts
var LexicalEmbedder = class {
  async embed(texts) {
    const dimension = 256;
    return texts.map((text) => {
      const vector = new Array(dimension).fill(0);
      const tokens = tokenize(text.toLowerCase());
      tokens.forEach((token) => {
        const hash = this.hash(token.value) % dimension;
        vector[hash] += 1;
      });
      return vector;
    });
  }
  hash(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
};
var SemanticChunker = class {
  constructor(options) {
    this.chunkSize = options.chunkSize ?? 600;
    this.strategy = options.thresholding ?? "zscore";
    this.embedder = options.embedder ?? new LexicalEmbedder();
    this.zScoreK = options.zScoreK ?? 1;
    this.smoothingWindow = options.smoothingWindow ?? 3;
    this.percentile = options.percentile ?? 10;
    this.gradientThreshold = options.gradientThreshold ?? 0.15;
  }
  async chunk(text) {
    const sentences = splitIntoSentences(text);
    if (sentences.length === 0)
      return [];
    if (sentences.length === 1) {
      return [
        {
          id: uuid3(),
          text: sentences[0].sentence,
          start: sentences[0].start,
          end: sentences[0].end
        }
      ];
    }
    const embeddings = await this.embedder.embed(sentences.map((sentence) => sentence.sentence));
    const similarities = pairwiseCosine(embeddings);
    const smoothed = movingAverage(similarities, this.smoothingWindow);
    const boundaryIndexes = await this.computeBoundaries(text, sentences.map((s) => s.sentence), smoothed);
    const chunks = [];
    let lastIndex = 0;
    for (const index of boundaryIndexes) {
      const startSentence = sentences[lastIndex];
      const endSentence = sentences[index];
      const chunkText = sentences.slice(lastIndex, index + 1).map((sentence) => sentence.sentence).join(" ");
      chunks.push({ id: uuid3(), text: chunkText, start: startSentence.start, end: endSentence.end });
      lastIndex = index + 1;
    }
    if (lastIndex < sentences.length) {
      const startSentence = sentences[lastIndex];
      const endSentence = sentences[sentences.length - 1];
      const chunkText = sentences.slice(lastIndex).map((sentence) => sentence.sentence).join(" ");
      chunks.push({ id: uuid3(), text: chunkText, start: startSentence.start, end: endSentence.end });
    }
    return this.enforceChunkSize(chunks);
  }
  async computeBoundaries(text, sentences, similarities) {
    switch (this.strategy) {
      case "zscore":
        return this.zScoreBoundaries(similarities);
      case "percentile":
        return this.percentileBoundaries(similarities);
      case "localMinima":
        return this.localMinimaBoundaries(similarities);
      case "gradient":
        return this.gradientBoundaries(similarities);
      case "texttiling":
        return this.toSentenceIndexes(text, textTilingBoundaries(text));
      case "c99":
        return this.toSentenceIndexes(text, await c99Boundaries(text, this.embedder));
      case "bayesian":
        return this.toSentenceIndexes(text, bayesSegBoundaries(text));
      default:
        return this.zScoreBoundaries(similarities);
    }
  }
  zScoreBoundaries(similarities) {
    const threshold = zScoreThreshold(similarities, this.zScoreK);
    return similarities.map((value, index) => ({ value, index })).filter(({ value }) => value < threshold).map(({ index }) => index);
  }
  percentileBoundaries(similarities) {
    const threshold = percentile(similarities, this.percentile);
    return similarities.map((value, index) => ({ value, index })).filter(({ value }) => value <= threshold).map(({ index }) => index);
  }
  localMinimaBoundaries(similarities) {
    const boundaries = [];
    for (let i = 1; i < similarities.length - 1; i++) {
      if (similarities[i] < similarities[i - 1] && similarities[i] < similarities[i + 1]) {
        boundaries.push(i);
      }
    }
    return boundaries;
  }
  gradientBoundaries(similarities) {
    const boundaries = [];
    for (let i = 0; i < similarities.length - 1; i++) {
      const gradient = similarities[i + 1] - similarities[i];
      if (gradient < -this.gradientThreshold) {
        boundaries.push(i);
      }
    }
    return boundaries;
  }
  toSentenceIndexes(text, boundaryPositions) {
    const sentences = splitIntoSentences(text);
    const indexes = [];
    boundaryPositions.forEach((position) => {
      const index = sentences.findIndex((sentence) => sentence.end >= position);
      if (index !== -1) {
        indexes.push(index);
      }
    });
    return indexes;
  }
  enforceChunkSize(chunks) {
    const result = [];
    let buffer = null;
    for (const chunk of chunks) {
      if (tokenize(chunk.text).length > this.chunkSize * 1.5) {
        result.push(...this.splitLargeChunk(chunk));
        continue;
      }
      if (!buffer) {
        buffer = chunk;
        continue;
      }
      const combined = `${buffer.text} ${chunk.text}`.trim();
      if (tokenize(combined).length <= this.chunkSize) {
        buffer = {
          id: buffer.id,
          text: combined,
          start: buffer.start,
          end: chunk.end
        };
      } else {
        result.push(buffer);
        buffer = chunk;
      }
    }
    if (buffer) {
      result.push(buffer);
    }
    return result;
  }
  splitLargeChunk(chunk) {
    const tokens = tokenize(chunk.text);
    const pieces = [];
    for (let i = 0; i < tokens.length; i += this.chunkSize) {
      const slice = tokens.slice(i, i + this.chunkSize);
      const text = slice.map((token) => token.value).join(" ");
      const startOffset = slice[0].start;
      const endOffset = slice[slice.length - 1].end;
      pieces.push({
        id: uuid3(),
        text,
        start: chunk.start + startOffset,
        end: chunk.start + endOffset
      });
    }
    return pieces;
  }
};

// src/chunkers/HybridChunker.ts
import { v4 as uuid4 } from "uuid";
var HybridChunker = class {
  constructor(options) {
    this.semantic = new SemanticChunker({ ...options, type: "semantic" });
    this.minChunkSize = options.minChunkSize ?? Math.floor((options.chunkSize ?? 600) / 2);
    this.maxChunkSize = options.maxChunkSize ?? (options.chunkSize ?? 600) * 1.5;
  }
  async chunk(text) {
    const paragraphs = splitIntoParagraphs(text);
    const chunks = [];
    for (const paragraph of paragraphs) {
      const tokens = tokenize(paragraph.sentence);
      if (tokens.length <= this.minChunkSize) {
        chunks.push({ id: uuid4(), text: paragraph.sentence, start: paragraph.start, end: paragraph.end });
      } else {
        const semanticChunks = await this.semantic.chunk(paragraph.sentence);
        semanticChunks.forEach((chunk) => {
          chunks.push({
            ...chunk,
            start: paragraph.start + chunk.start,
            end: paragraph.start + chunk.end
          });
        });
      }
    }
    return this.balanceChunks(chunks);
  }
  balanceChunks(chunks) {
    const balanced = [];
    let buffer = null;
    for (const chunk of chunks) {
      if (!buffer) {
        buffer = chunk;
        continue;
      }
      const combined = `${buffer.text}
${chunk.text}`.trim();
      const combinedTokens = tokenize(combined).length;
      if (combinedTokens < this.minChunkSize) {
        buffer = {
          id: buffer.id,
          text: combined,
          start: buffer.start,
          end: chunk.end
        };
      } else if (combinedTokens > this.maxChunkSize) {
        balanced.push(buffer);
        buffer = chunk;
      } else {
        buffer = {
          id: buffer.id,
          text: combined,
          start: buffer.start,
          end: chunk.end
        };
      }
    }
    if (buffer) {
      balanced.push(buffer);
    }
    return balanced;
  }
};

// src/chunkers/TopicChunker.ts
import { v4 as uuid5 } from "uuid";
var LexicalTopicEmbedder = class {
  async embed(texts) {
    const dimension = 256;
    return texts.map((text) => {
      const vector = new Array(dimension).fill(0);
      const tokens = tokenize(text.toLowerCase());
      tokens.forEach((token) => {
        const hash = this.hash(token.value) % dimension;
        vector[hash] += 1;
      });
      return vector;
    });
  }
  hash(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
};
var TopicChunker = class {
  constructor(options) {
    this.embedder = options.embedder ?? new LexicalTopicEmbedder();
    this.topicCount = options.topicCount;
  }
  async chunk(text) {
    const sentences = splitIntoSentences(text);
    if (!sentences.length)
      return [];
    const vectors = await this.embedder.embed(sentences.map((s) => s.sentence));
    const k = Math.min(
      sentences.length,
      this.topicCount ?? Math.max(2, Math.round(Math.sqrt(sentences.length)))
    );
    const assignments = this.kMeans(vectors, k);
    const chunks = [];
    let currentCluster = assignments[0];
    let startIndex = 0;
    for (let i = 1; i < assignments.length; i++) {
      if (assignments[i] !== currentCluster) {
        const startSentence2 = sentences[startIndex];
        const endSentence2 = sentences[i - 1];
        const chunkText2 = sentences.slice(startIndex, i).map((s) => s.sentence).join(" ");
        chunks.push({ id: uuid5(), text: chunkText2, start: startSentence2.start, end: endSentence2.end, metadata: { cluster: currentCluster } });
        startIndex = i;
        currentCluster = assignments[i];
      }
    }
    const startSentence = sentences[startIndex];
    const endSentence = sentences[sentences.length - 1];
    const chunkText = sentences.slice(startIndex).map((s) => s.sentence).join(" ");
    chunks.push({ id: uuid5(), text: chunkText, start: startSentence.start, end: endSentence.end, metadata: { cluster: currentCluster } });
    return chunks;
  }
  kMeans(vectors, k, iterations = 20) {
    const centroids = vectors.slice(0, k).map((vec) => [...vec]);
    const assignments = new Array(vectors.length).fill(0);
    for (let iteration = 0; iteration < iterations; iteration++) {
      let changed = false;
      for (let i = 0; i < vectors.length; i++) {
        let bestIndex = 0;
        let bestDistance = Infinity;
        for (let c = 0; c < k; c++) {
          const distance = this.euclideanDistance(vectors[i], centroids[c]);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = c;
          }
        }
        if (assignments[i] !== bestIndex) {
          assignments[i] = bestIndex;
          changed = true;
        }
      }
      if (!changed)
        break;
      const sums = Array.from({ length: k }, () => new Array(vectors[0].length).fill(0));
      const counts = new Array(k).fill(0);
      vectors.forEach((vector, index) => {
        const cluster = assignments[index];
        counts[cluster]++;
        for (let d = 0; d < vector.length; d++) {
          sums[cluster][d] += vector[d];
        }
      });
      for (let c = 0; c < k; c++) {
        if (counts[c] === 0)
          continue;
        centroids[c] = sums[c].map((value) => value / counts[c]);
      }
    }
    return assignments;
  }
  euclideanDistance(a, b) {
    const length = Math.max(a.length, b.length);
    let sum = 0;
    for (let i = 0; i < length; i++) {
      const diff = (a[i] ?? 0) - (b[i] ?? 0);
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }
};

// src/chunkers/SlidingWindowChunker.ts
import { v4 as uuid6 } from "uuid";
var SlidingWindowChunker = class {
  constructor(options) {
    this.chunkSize = options.chunkSize ?? 400;
    this.overlap = options.chunkOverlap ?? Math.floor(this.chunkSize / 4);
  }
  async chunk(text) {
    const sentences = splitIntoSentences(text);
    if (!sentences.length)
      return [];
    const tokens = tokenize(text);
    if (!tokens.length)
      return [];
    const stride = Math.max(1, this.chunkSize - this.overlap);
    const chunks = [];
    for (let start = 0; start < tokens.length; start += stride) {
      const end = Math.min(tokens.length, start + this.chunkSize);
      const chunkTokens = tokens.slice(start, end);
      const chunkText = chunkTokens.map((token) => token.value).join(" ").trim();
      const chunkStart = chunkTokens[0].start;
      const chunkEnd = chunkTokens[chunkTokens.length - 1].end;
      const boundaryAdjusted = this.expandToSentenceBoundaries(chunkStart, chunkEnd, sentences);
      chunks.push({ id: uuid6(), text: chunkText, start: boundaryAdjusted.start, end: boundaryAdjusted.end });
      if (end === tokens.length)
        break;
    }
    return chunks;
  }
  expandToSentenceBoundaries(start, end, sentences) {
    let expandedStart = start;
    let expandedEnd = end;
    for (const sentence of sentences) {
      if (sentence.start <= start && sentence.end >= start) {
        expandedStart = sentence.start;
      }
      if (sentence.start <= end && sentence.end >= end) {
        expandedEnd = sentence.end;
      }
    }
    return { start: expandedStart, end: expandedEnd };
  }
};

// src/core/Factory.ts
var registry = /* @__PURE__ */ new Map();
registry.set("fixed", (options) => new FixedChunker(options));
registry.set("recursive", (options) => new RecursiveChunker(options));
registry.set("semantic", (options) => new SemanticChunker(options));
registry.set("hybrid", (options) => new HybridChunker(options));
registry.set("topic", (options) => new TopicChunker(options));
registry.set("sliding", (options) => new SlidingWindowChunker(options));
function registerChunker(type, factory) {
  registry.set(type, factory);
}
function createChunker(options) {
  const factory = registry.get(options.type);
  if (!factory) {
    throw new Error(`Unknown chunker type: ${options.type}`);
  }
  return factory(options);
}

// src/embedders/OpenAIEmbedder.ts
var OpenAIEmbedder = class {
  constructor(options = {}) {
    this.apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? "";
    this.model = options.model ?? "text-embedding-3-small";
    this.endpoint = options.endpoint ?? "https://api.openai.com/v1/embeddings";
    if (!this.apiKey) {
      throw new Error("OpenAI API key is required for OpenAIEmbedder");
    }
  }
  async embed(texts) {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ input: texts, model: this.model })
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`OpenAI embedding request failed: ${message}`);
    }
    const data = await response.json();
    return data.data.map((entry) => entry.embedding);
  }
};

// src/embedders/HuggingFaceEmbedder.ts
var HuggingFaceEmbedder = class {
  constructor(options = {}) {
    this.apiKey = options.apiKey ?? process.env.HUGGINGFACE_API_KEY;
    this.model = options.model ?? "sentence-transformers/all-MiniLM-L6-v2";
    this.endpoint = options.endpoint ?? `https://api-inference.huggingface.co/pipeline/feature-extraction/${this.model}`;
  }
  async embed(texts) {
    const responses = [];
    for (const text of texts) {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}
        },
        body: JSON.stringify({ inputs: text })
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(`Hugging Face embedding request failed: ${message}`);
      }
      const data = await response.json();
      responses.push(Array.isArray(data[0]) ? data[0] : data);
    }
    return responses;
  }
};

// src/embedders/LocalModelEmbedder.ts
var LocalModelEmbedder = class {
  constructor(embedFn) {
    this.embedFn = embedFn;
  }
  async embed(texts) {
    const result = await this.embedFn(texts);
    return result;
  }
};
export {
  FixedChunker,
  HuggingFaceEmbedder,
  HybridChunker,
  LocalModelEmbedder,
  OpenAIEmbedder,
  RecursiveChunker,
  SemanticChunker,
  SlidingWindowChunker,
  TopicChunker,
  createChunker,
  registerChunker
};
//# sourceMappingURL=index.mjs.map