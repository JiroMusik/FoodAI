import Database from 'better-sqlite3';
import path from 'path';

// Initialize SQLite Database
const dbDir = process.env.DB_DIR || process.cwd();
const dbPath = path.join(dbDir, 'inventory.db');
export const db = new Database(dbPath);
