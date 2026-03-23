import { verifyAccessToken } from "../utils/tokens.js";
import { UserModel } from "../models/user.js";

export function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.access_token;
    if (!token) return res.status(401).json({ error: "Not authenticated. Please log in." });
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired.", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ error: "Invalid session. Please log in again." });
  }
}

export async function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.access_token;
    if (!token) return res.status(401).json({ error: "Not authenticated." });
    const payload = verifyAccessToken(token);
    req.user = payload;

    // Verify admin flag from DB (not just token)
    const user = await UserModel.findById(payload.sub);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Admin access required." });
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid session." });
  }
}

export function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.access_token;
    if (token) req.user = verifyAccessToken(token);
  } catch (_) {}
  next();
}
