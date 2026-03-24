import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

const UserSchema = new mongoose.Schema({
  name:              { type: String, required: true },
  email:             { type: String, required: true, unique: true, lowercase: true },
  password:          { type: String, default: null },
  googleId:          { type: String, default: null },
  avatar:            { type: String, default: null },
  plan:              { type: String, default: "free", enum: ["free", "pro", "enterprise"] },
  isAdmin:           { type: Boolean, default: false },
  suspended:         { type: Boolean, default: false },
  generationsUsed:   { type: Number, default: 0 },
  generationsLimit:  { type: Number, default: 100 },
  lastLoginAt:       { type: Date, default: Date.now },
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model("User", UserSchema);

export const UserModel = {
  async findByEmail(email) {
    return User.findOne({ email: email.toLowerCase() }).select("+password").lean();
  },

  async findById(id) {
    return User.findById(id).lean();
  },

  async getAll() {
    const users = await User.find({}).lean();
    return users.map(u => this.sanitize(u));
  },

  async create({ name, email, password, googleId, avatar }) {
    const existing = await this.findByEmail(email);
    if (existing) {
      if (existing.googleId && !existing.password) throw new Error("GOOGLE_ACCOUNT");
      throw new Error("EMAIL_EXISTS");
    }

    const hashedPassword = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;
    const isFirstUser = (await User.countDocuments()) === 0;

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      googleId: googleId || null,
      avatar: avatar || null,
      isAdmin: isFirstUser,
    });

    return this.sanitize(user.toObject());
  },

  async findOrCreateGoogleUser({ googleId, email, name, avatar }) {
    let user = await User.findOne({ googleId }).lean();
    if (user) {
      await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });
      return this.sanitize(user);
    }

    user = await User.findOne({ email: email.toLowerCase() }).lean();
    if (user) {
      const updated = await User.findByIdAndUpdate(
        user._id,
        { googleId, avatar: avatar || user.avatar, lastLoginAt: new Date() },
        { new: true }
      ).lean();
      return this.sanitize(updated);
    }

    return await this.create({ name, email, googleId, avatar });
  },

  async updateLastLogin(userId) {
    await User.findByIdAndUpdate(userId, { lastLoginAt: new Date() });
  },

  async verifyPassword(user, password) {
    if (!user.password) return false;
    // user may be sanitized (has .id) or raw (has ._id)
    const id = user._id || user.id;
    const fullUser = await User.findById(id).select("+password").lean();
    if (!fullUser?.password) return false;
    return bcrypt.compare(password, fullUser.password);
  },

  async incrementUsage(userId) {
    await User.findByIdAndUpdate(userId, { $inc: { generationsUsed: 1 } });
  },

  async resetUsage(userId) {
    await User.findByIdAndUpdate(userId, { generationsUsed: 0 });
  },

  async adminUpdate(userId, { plan, generationsLimit, suspended, isAdmin }) {
    const updates = {};
    if (plan !== undefined) updates.plan = plan;
    if (generationsLimit !== undefined) updates.generationsLimit = generationsLimit;
    if (suspended !== undefined) updates.suspended = suspended;
    if (isAdmin !== undefined) updates.isAdmin = isAdmin;

    const user = await User.findByIdAndUpdate(userId, updates, { new: true }).lean();
    if (!user) throw new Error("User not found.");
    return this.sanitize(user);
  },

  async adminDelete(userId) {
    await User.findByIdAndDelete(userId);
    await RefreshToken.deleteMany({ userId });
  },

  async updateProfile(userId, { name, email, avatar }) {
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email.toLowerCase();
    if (avatar !== undefined) updates.avatar = avatar;
    const user = await User.findByIdAndUpdate(userId, updates, { new: true }).lean();
    return this.sanitize(user);
  },

  async changePassword(userId, newPassword) {
    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await User.findByIdAndUpdate(userId, { password: hashed });
  },

  sanitize(user) {
    if (!user) return null;
    const { password, __v, ...safe } = user;
    // Normalize _id to id for frontend compatibility
    safe.id = safe._id?.toString() || safe.id;
    delete safe._id;
    return safe;
  },
};

// ── Refresh Token Schema ──────────────────────────────────────
const RefreshTokenSchema = new mongoose.Schema({
  token:     { type: String, required: true, unique: true },
  userId:    { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

export const RefreshToken = mongoose.models.RefreshToken ||
  mongoose.model("RefreshToken", RefreshTokenSchema);

// ── Project Schema ────────────────────────────────────────────
const ProjectSchema = new mongoose.Schema({
  userId:      { type: String, required: true },
  name:        { type: String, required: true },
  description: { type: String, default: "" },
  sourceCount: { type: Number, default: 0 },
}, { timestamps: true });

export const Project = mongoose.models.Project ||
  mongoose.model("Project", ProjectSchema);

export const ProjectModel = {
  async getAll(userId) {
    return Project.find({ userId }).sort({ createdAt: -1 }).lean();
  },

  async getById(projectId, userId) {
    const project = await Project.findById(projectId).lean();
    if (!project) return null;
    if (project.userId !== userId) return null;
    return project;
  },

  async create({ userId, name, description }) {
    const project = await Project.create({
      userId,
      name: name.trim(),
      description: description?.trim() || "",
    });
    return project.toObject();
  },

  async update(projectId, userId, { name, description }) {
    const project = await Project.findOneAndUpdate(
      { _id: projectId, userId },
      { ...(name && { name }), ...(description !== undefined && { description }) },
      { new: true }
    ).lean();
    if (!project) throw new Error("Project not found.");
    return project;
  },

  async updateSourceCount(projectId, count) {
    await Project.findByIdAndUpdate(projectId, { sourceCount: count });
  },

  async delete(projectId, userId) {
    const result = await Project.findOneAndDelete({ _id: projectId, userId });
    if (!result) throw new Error("Project not found.");
  },
};

// ── Error Log Schema ──────────────────────────────────────────
const ErrorLogSchema = new mongoose.Schema({
  route:     String,
  method:    String,
  status:    Number,
  message:   String,
  stack:     String,
  userId:    String,
  ip:        String,
  userAgent: String,
  resolved:  { type: Boolean, default: false },
}, { timestamps: true });

export const ErrorLog = mongoose.models.ErrorLog ||
  mongoose.model("ErrorLog", ErrorLogSchema);

// ── History Schema ────────────────────────────────────────────
const HistorySchema = new mongoose.Schema({
  userId:   { type: String, required: true, index: true },
  toolId:   { type: String, required: true },
  toolName: { type: String, required: true },
  fields:   { type: mongoose.Schema.Types.Mixed, default: {} },
  output:   { type: String, required: true },
}, { timestamps: true });

// Index for fast user queries
HistorySchema.index({ userId: 1, createdAt: -1 });

export const History = mongoose.models.History ||
  mongoose.model("History", HistorySchema);
