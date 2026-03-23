import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { UserModel } from "../models/user.js";

const router = Router();

// ── GET /generate/status ──────────────────────────────────────
router.get("/status", async (req, res) => {
  if (process.env.GROQ_API_KEY) {
    return res.json({
      status: "online",
      provider: "Groq",
      activeModel: process.env.GROQ_MODEL || "llama3-8b-8192",
      availableModels: ["llama3-8b-8192", "llama3-70b-8192", "mixtral-8x7b-32768", "gemma2-9b-it"],
    });
  }

  // Fallback: check Ollama
  try {
    const response = await fetch(
      `${process.env.OLLAMA_URL || "http://localhost:11434"}/api/tags`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!response.ok) throw new Error();
    const data = await response.json();
    return res.json({
      status: "online",
      provider: "Ollama",
      activeModel: process.env.OLLAMA_MODEL || "llama3.2",
      availableModels: data.models?.map(m => m.name) || [],
    });
  } catch {
    return res.status(503).json({
      status: "offline",
      provider: "none",
      error: "No AI provider configured. Add GROQ_API_KEY to environment variables.",
    });
  }
});

// ── POST /generate ────────────────────────────────────────────
router.post("/", requireAuth, async (req, res) => {
  const { systemPrompt, userMessage } = req.body;

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

  // ── Try Groq first, fallback to Ollama ────────────────────
  if (process.env.GROQ_API_KEY) {
    return generateWithGroq(req, res, systemPrompt, userMessage);
  }

  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  try {
    await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
    return generateWithOllama(req, res, systemPrompt, userMessage, ollamaUrl);
  } catch {
    return res.status(503).json({
      error: "No AI provider available. Please configure GROQ_API_KEY in your environment.",
    });
  }
});

// ── Groq generation ───────────────────────────────────────────
async function generateWithGroq(req, res, systemPrompt, userMessage) {
  const model = process.env.GROQ_MODEL || "llama3-8b-8192";

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream: true,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}));
      if (groqRes.status === 401) return res.status(500).json({ error: "Invalid Groq API key." });
      if (groqRes.status === 429) return res.status(429).json({ error: "Groq rate limit reached. Try again shortly." });
      return res.status(500).json({ error: err.error?.message || "Groq API error." });
    }

    // Stream SSE back to client
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const reader = groqRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") { res.write("data: [DONE]\n\n"); continue; }
        try {
          const parsed = JSON.parse(data);
          const text = parsed.choices?.[0]?.delta?.content || "";
          if (text) {
            // Convert to same format frontend expects
            res.write(`data: ${JSON.stringify({ delta: { text } })}\n\n`);
          }
        } catch (_) {}
      }
    }

    res.end();
    await UserModel.incrementUsage(req.user.sub);

  } catch (err) {
    console.error("[groq]", err);
    if (!res.headersSent) res.status(500).json({ error: "Generation failed. Please try again." });
  }
}

// ── Ollama generation (local fallback) ────────────────────────
async function generateWithOllama(req, res, systemPrompt, userMessage, ollamaUrl) {
  const model = process.env.OLLAMA_MODEL || "llama3.2";

  try {
    const ollamaRes = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: `${systemPrompt}\n\nUser request: ${userMessage}\n\nResponse:`,
        stream: true,
        options: { temperature: 0.7, top_p: 0.9, num_predict: 2048 },
      }),
    });

    if (!ollamaRes.ok) {
      const err = await ollamaRes.json().catch(() => ({}));
      return res.status(500).json({ error: err.error || "Ollama error." });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

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
    console.error("[ollama]", err);
    if (!res.headersSent) res.status(500).json({ error: "Generation failed. Please try again." });
  }
}

export default router;
