import fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
import mammoth from "mammoth";
import * as cheerio from "cheerio";

// ── Extract text from uploaded file ──────────────────────────
export async function extractTextFromFile(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();

  // PDF
  if (mimeType === "application/pdf" || ext === ".pdf") {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  // DOCX
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || ext === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  // Plain text
  if (mimeType === "text/plain" || ext === ".txt") {
    return fs.readFileSync(filePath, "utf8");
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

// ── Scrape text from a URL ────────────────────────────────────
export async function extractTextFromURL(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 ContentAI RAG Bot" },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  // Remove noise
  $("script, style, nav, footer, header, aside, iframe, noscript").remove();

  // Get title + main content
  const title = $("title").text().trim();
  const body = $("article, main, .content, .post, body").first().text();

  const text = `${title}\n\n${body}`
    .replace(/\s+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (text.length < 100) throw new Error("Could not extract meaningful content from URL.");
  return text;
}

// ── Split text into overlapping chunks ───────────────────────
export function chunkText(text, chunkSize = 500, overlap = 50) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim().length > 30) { // Skip tiny chunks
      chunks.push(chunk.trim());
    }
    if (i + chunkSize >= words.length) break;
  }

  return chunks;
}
