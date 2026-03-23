import { v4 as uuidv4 } from "uuid";
import db from "../config/db.js";

export const ProjectModel = {
  async getAll(userId) {
    await db.read();
    db.data.projects ||= [];
    return db.data.projects.filter(p => p.userId === userId);
  },

  async getById(projectId, userId) {
    await db.read();
    db.data.projects ||= [];
    const project = db.data.projects.find(p => p.id === projectId);
    if (!project) return null;
    if (project.userId !== userId) return null; // Ownership check
    return project;
  },

  async create({ userId, name, description }) {
    await db.read();
    db.data.projects ||= [];

    const project = {
      id: uuidv4(),
      userId,
      name: name.trim(),
      description: description?.trim() || "",
      sourceCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.data.projects.push(project);
    await db.write();
    return project;
  },

  async update(projectId, userId, { name, description }) {
    await db.read();
    db.data.projects ||= [];
    const project = db.data.projects.find(p => p.id === projectId && p.userId === userId);
    if (!project) throw new Error("Project not found.");
    if (name) project.name = name.trim();
    if (description !== undefined) project.description = description.trim();
    project.updatedAt = new Date().toISOString();
    await db.write();
    return project;
  },

  async updateSourceCount(projectId, count) {
    await db.read();
    db.data.projects ||= [];
    const project = db.data.projects.find(p => p.id === projectId);
    if (project) {
      project.sourceCount = count;
      project.updatedAt = new Date().toISOString();
      await db.write();
    }
  },

  async delete(projectId, userId) {
    await db.read();
    db.data.projects ||= [];
    const idx = db.data.projects.findIndex(p => p.id === projectId && p.userId === userId);
    if (idx === -1) throw new Error("Project not found.");
    db.data.projects.splice(idx, 1);
    await db.write();
  },
};
