import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "../middleware/auth.js";
import { ProjectModel } from "../models/project.js";
import { extractTextFromFile, extractTextFromURL, chunkText } from "../utils/extractor.js";
import {
  addChunksToProject,
  removeSourceFromProject,
  searchProject,
  getProjectSources,
  deleteProjectStore,
} from "../utils/vectorStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "../../data/uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const router = Router();

// Multer config — accept PDF, DOCX, TXT only
const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOCX, and TXT files are allowed."));
    }
  },
});

// ── GET /projects ──────────────────────────────────────────────
router.get("/", requireAuth, async (req, res) => {
  try {
    const projects = await ProjectModel.getAll(req.user.sub);
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch projects." });
  }
});

// ── POST /projects ─────────────────────────────────────────────
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(422).json({ error: "Project name is required." });
    const project = await ProjectModel.create({ userId: req.user.sub, name, description });
    res.status(201).json({ project });
  } catch (err) {
    res.status(500).json({ error: "Failed to create project." });
  }
});

// ── PATCH /projects/:id ────────────────────────────────────────
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const project = await ProjectModel.update(req.params.id, req.user.sub, req.body);
    res.json({ project });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// ── DELETE /projects/:id ───────────────────────────────────────
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await ProjectModel.delete(req.params.id, req.user.sub);
    deleteProjectStore(req.params.id);
    res.json({ message: "Project deleted." });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// ── GET /projects/:id/sources ──────────────────────────────────
router.get("/:id/sources", requireAuth, async (req, res) => {
  try {
    const project = await ProjectModel.getById(req.params.id, req.user.sub);
    if (!project) return res.status(404).json({ error: "Project not found." });
    const sources = getProjectSources(req.params.id);
    res.json({ sources });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sources." });
  }
});

// ── POST /projects/:id/sources/file ───────────────────────────
router.post("/:id/sources/file", requireAuth, upload.single("file"), async (req, res) => {
  const filePath = req.file?.path;
  try {
    const project = await ProjectModel.getById(req.params.id, req.user.sub);
    if (!project) return res.status(404).json({ error: "Project not found." });
    if (!req.file) return res.status(422).json({ error: "No file uploaded." });

    // Extract text
    const text = await extractTextFromFile(filePath, req.file.mimetype);
    if (!text?.trim()) throw new Error("Could not extract text from file.");

    // Chunk and embed
    const chunks = chunkText(text);
    const sourceId = uuidv4();
    const count = await addChunksToProject(req.params.id, chunks, {
      id: sourceId,
      name: req.file.originalname,
      type: "file",
    });

    // Update source count
    const sources = getProjectSources(req.params.id);
    await ProjectModel.updateSourceCount(req.params.id, sources.length);

    res.status(201).json({
      message: `Processed ${count} chunks from "${req.file.originalname}"`,
      sourceId,
      chunkCount: count,
    });
  } catch (err) {
    console.error("[upload]", err);
    res.status(500).json({ error: err.message || "Failed to process file." });
  } finally {
    // Clean up temp upload file
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

// ── POST /projects/:id/sources/url ────────────────────────────
router.post("/:id/sources/url", requireAuth, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(422).json({ error: "URL is required." });

    const project = await ProjectModel.getById(req.params.id, req.user.sub);
    if (!project) return res.status(404).json({ error: "Project not found." });

    // Scrape & extract
    const text = await extractTextFromURL(url);
    const chunks = chunkText(text);
    const sourceId = uuidv4();
    const count = await addChunksToProject(req.params.id, chunks, {
      id: sourceId,
      name: url,
      type: "url",
    });

    const sources = getProjectSources(req.params.id);
    await ProjectModel.updateSourceCount(req.params.id, sources.length);

    res.status(201).json({
      message: `Processed ${count} chunks from URL`,
      sourceId,
      chunkCount: count,
    });
  } catch (err) {
    console.error("[url-source]", err);
    res.status(500).json({ error: err.message || "Failed to process URL." });
  }
});

// ── DELETE /projects/:id/sources/:sourceId ────────────────────
router.delete("/:id/sources/:sourceId", requireAuth, async (req, res) => {
  try {
    const project = await ProjectModel.getById(req.params.id, req.user.sub);
    if (!project) return res.status(404).json({ error: "Project not found." });

    const removed = removeSourceFromProject(req.params.id, req.params.sourceId);
    const sources = getProjectSources(req.params.id);
    await ProjectModel.updateSourceCount(req.params.id, sources.length);

    res.json({ message: `Removed ${removed} chunks.` });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove source." });
  }
});

// ── POST /projects/:id/search ─────────────────────────────────
// Test endpoint — search the knowledge base directly
router.post("/:id/search", requireAuth, async (req, res) => {
  try {
    const { query, topK = 5 } = req.body;
    if (!query) return res.status(422).json({ error: "Query is required." });

    const project = await ProjectModel.getById(req.params.id, req.user.sub);
    if (!project) return res.status(404).json({ error: "Project not found." });

    const results = await searchProject(req.params.id, query, topK);
    res.json({ results, count: results.length });
  } catch (err) {
    console.error("[search]", err);
    res.status(500).json({ error: err.message || "Search failed." });
  }
});

export default router;
