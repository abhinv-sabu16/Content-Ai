import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import db from "../config/db.js";

const SALT_ROUNDS = 12;

export const UserModel = {
  async findByEmail(email) {
    await db.read();
    return db.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async findById(id) {
    await db.read();
    return db.data.users.find((u) => u.id === id) || null;
  },

  async getAll() {
    await db.read();
    return db.data.users.map(u => this.sanitize(u));
  },

  async create({ name, email, password, googleId, avatar }) {
    await db.read();

    const existing = await this.findByEmail(email);
    if (existing) {
      if (existing.googleId && !existing.password) throw new Error("GOOGLE_ACCOUNT");
      throw new Error("EMAIL_EXISTS");
    }

    const hashedPassword = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;
    const isFirstUser = db.data.users.length === 0; // First user becomes admin

    const user = {
      id: uuidv4(),
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      googleId: googleId || null,
      avatar: avatar || null,
      plan: "free",
      isAdmin: isFirstUser,
      suspended: false,
      generationsUsed: 0,
      generationsLimit: 100,
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.data.users.push(user);
    await db.write();
    return this.sanitize(user);
  },

  async findOrCreateGoogleUser({ googleId, email, name, avatar }) {
    await db.read();
    let user = db.data.users.find((u) => u.googleId === googleId);
    if (user) {
      user.lastLoginAt = new Date().toISOString();
      await db.write();
      return this.sanitize(user);
    }
    user = db.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      user.googleId = googleId;
      user.avatar = avatar || user.avatar;
      user.lastLoginAt = new Date().toISOString();
      user.updatedAt = new Date().toISOString();
      await db.write();
      return this.sanitize(user);
    }
    return await this.create({ name, email, googleId, avatar });
  },

  async updateLastLogin(userId) {
    await db.read();
    const user = db.data.users.find((u) => u.id === userId);
    if (user) {
      user.lastLoginAt = new Date().toISOString();
      await db.write();
    }
  },

  async verifyPassword(user, password) {
    if (!user.password) return false;
    const fullUser = db.data.users.find((u) => u.id === user.id);
    return bcrypt.compare(password, fullUser.password);
  },

  async incrementUsage(userId) {
    await db.read();
    const user = db.data.users.find((u) => u.id === userId);
    if (user) {
      user.generationsUsed = (user.generationsUsed || 0) + 1;
      user.updatedAt = new Date().toISOString();
      await db.write();
    }
  },

  async adminUpdate(userId, { plan, generationsLimit, suspended, isAdmin }) {
    await db.read();
    const user = db.data.users.find((u) => u.id === userId);
    if (!user) throw new Error("User not found.");
    if (plan !== undefined) user.plan = plan;
    if (generationsLimit !== undefined) user.generationsLimit = generationsLimit;
    if (suspended !== undefined) user.suspended = suspended;
    if (isAdmin !== undefined) user.isAdmin = isAdmin;
    user.updatedAt = new Date().toISOString();
    await db.write();
    return this.sanitize(user);
  },

  async adminDelete(userId) {
    await db.read();
    db.data.users = db.data.users.filter(u => u.id !== userId);
    db.data.refreshTokens = (db.data.refreshTokens || []).filter(t => t.userId !== userId);
    await db.write();
  },

  async resetUsage(userId) {
    await db.read();
    const user = db.data.users.find((u) => u.id === userId);
    if (user) {
      user.generationsUsed = 0;
      user.updatedAt = new Date().toISOString();
      await db.write();
    }
  },

  sanitize(user) {
    const { password, ...safe } = user;
    return safe;
  },
};
