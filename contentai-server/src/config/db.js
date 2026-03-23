import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "../../data");

mkdirSync(dataDir, { recursive: true });

const adapter = new JSONFile(join(dataDir, "db.json"));

const defaultData = {
  users: [],
  refreshTokens: [],
};

const db = new Low(adapter, defaultData);

await db.read();

// Ensure default structure exists
db.data ||= defaultData;
db.data.users ||= [];
db.data.refreshTokens ||= [];

await db.write();

export default db;
