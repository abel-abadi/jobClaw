import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', '..', 'data');
const DB_PATH = join(DATA_DIR, 'jobclaw.db');

let db;

export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

export function initDb() {
  mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    -- Career Profile (one row)
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY DEFAULT 1,
      name TEXT,
      email TEXT,
      phone TEXT,
      linkedin TEXT,
      github TEXT,
      portfolio TEXT,
      summary TEXT,
      experience TEXT DEFAULT '[]',
      education TEXT DEFAULT '[]',
      skills TEXT DEFAULT '[]',
      target_titles TEXT DEFAULT '[]',
      target_locations TEXT DEFAULT '[]',
      remote_preference TEXT DEFAULT 'any',
      min_salary INTEGER,
      excluded_companies TEXT DEFAULT '[]',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Insert default profile row if not exists
    INSERT OR IGNORE INTO profile (id) VALUES (1);

    -- App Settings (key/value store)
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- Seed default settings
    INSERT OR IGNORE INTO settings VALUES ('ai_provider', 'openai');
    INSERT OR IGNORE INTO settings VALUES ('ai_model', 'gpt-4o');
    INSERT OR IGNORE INTO settings VALUES ('openai_api_key', '');
    INSERT OR IGNORE INTO settings VALUES ('anthropic_api_key', '');
    INSERT OR IGNORE INTO settings VALUES ('ollama_base_url', 'http://localhost:11434');
    INSERT OR IGNORE INTO settings VALUES ('adzuna_app_id', '');
    INSERT OR IGNORE INTO settings VALUES ('adzuna_api_key', '');
    INSERT OR IGNORE INTO settings VALUES ('scan_schedule', '0 7 * * *');
    INSERT OR IGNORE INTO settings VALUES ('match_threshold', '60');

    -- Discovered Jobs
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT,
      remote INTEGER DEFAULT 0,
      description TEXT,
      url TEXT,
      source TEXT,
      salary_min INTEGER,
      salary_max INTEGER,
      match_score INTEGER DEFAULT 0,
      resume_status TEXT DEFAULT 'pending',
      status TEXT DEFAULT 'new',
      discovered_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Applications (jobs the user has acted on)
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id),
      status TEXT DEFAULT 'saved',
      applied_at TEXT,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Resume files per job
    CREATE TABLE IF NOT EXISTS resumes (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id),
      tex_content TEXT,
      pdf_path TEXT,
      generated_at TEXT DEFAULT (datetime('now')),
      status TEXT DEFAULT 'pending'
    );
  `);

  console.log('✅ Database initialized at', DB_PATH);
  return db;
}
