import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VECTORS_DIR = path.join(__dirname, "../../data/vectors");
mkdirSync(VECTORS_DIR, { recursive: true });

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const EMBED_MODEL = "nomic-embed-text";

// ── Get embedding from Ollama ─────────────────────────────────
export async function getEmbedding(text) {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to get embedding from Ollama.");
  }

  const data = await res.json();
  return data.embedding; // float[]
}

// ── Cosine similarity between two vectors ────────────────────
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ── File path for a project's vector store ───────────────────
function getStorePath(projectId) {
  return path.join(VECTORS_DIR, `${projectId}.json`);
}

// ── Load vector store for a project ─────────────────────────
export function loadVectorStore(projectId) {
  const storePath = getStorePath(projectId);
  if (!fs.existsSync(storePath)) return { chunks: [] };
  try {
    return JSON.parse(fs.readFileSync(storePath, "utf8"));
  } catch { return { chunks: [] }; }
}

// ── Save vector store for a project ─────────────────────────
function saveVectorStore(projectId, store) {
  fs.writeFileSync(getStorePath(projectId), JSON.stringify(store, null, 2));
}

// ── Add chunks (with embeddings) to a project ────────────────
export async function addChunksToProject(projectId, chunks, sourceInfo) {
  const store = loadVectorStore(projectId);

  // Remove existing chunks from same source
  store.chunks = store.chunks.filter(c => c.sourceId !== sourceInfo.id);

  // Embed each chunk and store
  const newChunks = [];
  for (let i = 0; i < chunks.length; i++) {
    const text = chunks[i];
    try {
      const embedding = await getEmbedding(text);
      newChunks.push({
        id: `${sourceInfo.id}_${i}`,
        sourceId: sourceInfo.id,
        sourceName: sourceInfo.name,
        sourceType: sourceInfo.type,
        text,
        embedding,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`[embed] chunk ${i} failed:`, err.message);
    }
  }

  store.chunks.push(...newChunks);
  saveVectorStore(projectId, store);
  return newChunks.length;
}

// ── Remove all chunks from a source ──────────────────────────
export function removeSourceFromProject(projectId, sourceId) {
  const store = loadVectorStore(projectId);
  const before = store.chunks.length;
  store.chunks = store.chunks.filter(c => c.sourceId !== sourceId);
  saveVectorStore(projectId, store);
  return before - store.chunks.length;
}

// ── Search: find top-k most similar chunks to a query ────────
export async function searchProject(projectId, query, topK = 5) {
  const store = loadVectorStore(projectId);
  if (!store.chunks.length) return [];

  const queryEmbedding = await getEmbedding(query);

  const scored = store.chunks.map(chunk => ({
    ...chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter(c => c.score > 0.3) // Minimum relevance threshold
    .map(({ embedding, ...rest }) => rest); // Strip embeddings from response
}

// ── Get all unique sources in a project ──────────────────────
export function getProjectSources(projectId) {
  const store = loadVectorStore(projectId);
  const seen = new Map();
  for (const chunk of store.chunks) {
    if (!seen.has(chunk.sourceId)) {
      seen.set(chunk.sourceId, {
        id: chunk.sourceId,
        name: chunk.sourceName,
        type: chunk.sourceType,
        chunkCount: 0,
        createdAt: chunk.createdAt,
      });
    }
    seen.get(chunk.sourceId).chunkCount++;
  }
  return [...seen.values()];
}

// ── Delete entire project vector store ───────────────────────
export function deleteProjectStore(projectId) {
  const storePath = getStorePath(projectId);
  if (fs.existsSync(storePath)) fs.unlinkSync(storePath);
}
