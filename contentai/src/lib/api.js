const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function generateContent(systemPrompt, userMessage, onChunk, projectId = null, onRagUsed = null, signal = null) {
  const response = await fetch(`${API}/generate`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      systemPrompt,
      userMessage,
      model: "llama-3.1-8b-instant",
      maxTokens: 2048,
      ...(projectId ? { projectId } : {}),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Generation failed. Please try again.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
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
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);

        // RAG context notification
        if (parsed.type === "rag_context_used") {
          onRagUsed?.(true);
          continue;
        }

        const text = parsed.delta?.text || "";
        if (text) {
          fullText += text;
          onChunk?.(fullText);
        }
      } catch (_) {}
    }
  }

  // Flush remaining buffer
  if (buffer.startsWith("data: ")) {
    const data = buffer.slice(6).trim();
    try {
      const parsed = JSON.parse(data);
      const text = parsed.delta?.text || "";
      if (text) { fullText += text; onChunk?.(fullText); }
    } catch (_) {}
  }

  return fullText;
}
