import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import passport from "passport";

import { connectDB } from "./src/config/db.js";
import { configurePassport } from "./src/config/passport.js";
import authRoutes from "./src/routes/auth.js";
import userRoutes from "./src/routes/users.js";
import generateRoutes from "./src/routes/generate.js";
import projectRoutes from "./src/routes/projects.js";
import adminRoutes from "./src/routes/admin.js";
import historyRoutes from "./src/routes/history.js";
import { logError } from "./src/utils/errorLogger.js";

// Connect to MongoDB first
await connectDB();

const app = express();
const PORT = process.env.PORT || 4000;

// Trust Railway/Render proxy for correct IP detection and rate limiting
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const allowed = [
      process.env.CLIENT_URL,
      "http://localhost:5173",
      "http://localhost:3000",
    ].filter(Boolean);

    // Exact match
    if (allowed.includes(origin)) return callback(null, true);

    // Allow all Vercel preview deployments
    if (origin.match(/https:\/\/.*\.vercel\.app$/)) return callback(null, true);

    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

configurePassport();
app.use(passport.initialize());

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/generate", generateRoutes);
app.use("/projects", projectRoutes);
app.use("/admin", adminRoutes);
app.use("/history", historyRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  logError({
    route: req.path, method: req.method, status: 404,
    message: `Route not found: ${req.method} ${req.path}`,
    userId: req.user?.sub || null, ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
  res.status(404).json({ error: "The requested resource was not found." });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  logError({
    route: req.path, method: req.method, status,
    message: err.message, stack: err.stack,
    userId: req.user?.sub || null, ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
  console.error("[error]", err.stack);
  res.status(status).json({ error: "Something went wrong. Please try again." });
});

app.listen(PORT, () => {
  console.log(`\n🚀 ContentAI server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   CORS origin:  ${process.env.CLIENT_URL || "http://localhost:5173"}\n`);
});

export default app;
