import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { UserModel } from "../models/user.js";
import { searchProject } from "../utils/vectorStore.js";
import { ProjectModel } from "../models/project.js";

const router = Router();

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

// ── GET /generate/status ──────────────────────────────────────
router.get("/status", async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error("Ollama not responding");
    const data = await response.json();
    const models = data.models?.map(m => m.name) || [];
    res.json({ status: "online", url: OLLAMA_URL, activeModel: OLLAMA_MODEL, availableModels: models });
  } catch {
    res.status(503).json({ status: "offline", error: "Ollama is not running. Start it with: ollama serve" });
  }
});

// ── POST /generate ────────────────────────────────────────────
router.post("/", requireAuth, async (req, res) => {
  const { systemPrompt, userMessage, model, projectId } = req.body;
  const ollamaModel = model || OLLAMA_MODEL;

  if (!systemPrompt || !userMessage) {
    return res.status(422).json({ error: "systemPrompt and userMessage are required." });
  }

  // Check usage limit
  try {
    const user = await UserModel.findById(req.user.sub);
    if (user && user.generationsUsed >= user.generationsLimit) {
      return res.status(429).json({ error: "Generation limit reached. Please upgrade your plan." });
    }
  } catch (_) {}

  // Check Ollama is reachable
  try {
    await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) });
  } catch {
    return res.status(503).json({ error: "Ollama is not running. Please start it with: ollama serve" });
  }

  try {
    // ── RAG: retrieve relevant context if projectId provided ──
    let ragContext = "";
    if (projectId) {
      try {
        // Verify project belongs to user
        const project = await ProjectModel.getById(projectId, req.user.sub);
        if (project) {
          const results = await searchProject(projectId, userMessage, 5);
          if (results.length > 0) {
            ragContext = results.map((r, i) =>
              `[Source ${i + 1}: ${r.sourceName}]\n${r.text}`
            ).join("\n\n---\n\n");
          }
        }
      } catch (err) {
        console.error("[rag-search]", err.message);
        // Don't fail generation if RAG search fails — just continue without context
      }
    }

    // ── Build final prompt ────────────────────────────────────
    let fullPrompt;
    if (ragContext) {
      fullPrompt = `${systemPrompt}

--- KNOWLEDGE BASE CONTEXT ---
The following excerpts are from the user's uploaded documents. Use this context to inform your response where relevant. Prioritize accuracy over creativity when the context is clear.

${ragContext}
--- END OF CONTEXT ---

User request: ${userMessage}

Response:`;
    } else {
      fullPrompt = `${systemPrompt}\n\nUser request: ${userMessage}\n\nResponse:`;
    }

    const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: fullPrompt,
        stream: true,
        options: { temperature: 0.7, top_p: 0.9, num_predict: 2048 },
      }),
    });

    if (!ollamaRes.ok) {
      const err = await ollamaRes.json().catch(() => ({}));
      if (ollamaRes.status === 404 || err.error?.includes("not found")) {
        return res.status(404).json({ error: `Model "${ollamaModel}" not found. Run: ollama pull ${ollamaModel}` });
      }
      return res.status(500).json({ error: err.error || "Ollama error." });
    }

    // Stream back in same SSE format frontend expects
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Tell frontend whether RAG context was used
    if (ragContext) {
      res.write(`data: ${JSON.stringify({ type: "rag_context_used", count: ragContext.split("---").length })}\n\n`);
    }

    const reader = ollamaRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          const text = parsed.response || "";
          if (text) res.write(`data: ${JSON.stringify({ delta: { text } })}\n\n`);
          if (parsed.done) res.write("data: [DONE]\n\n");
        } catch (_) {}
      }
    }

    res.end();
    await UserModel.incrementUsage(req.user.sub);

  } catch (err) {
    console.error("[generate]", err);
    if (!res.headersSent) res.status(500).json({ error: "Generation failed. Please try again." });
  }
});

export default router;
