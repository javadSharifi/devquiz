-- ============================================================
-- DevQuiz — Cloudflare D1 Database Schema
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_states (
  user_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  state TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, topic_id, question_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_gamification (
  user_id TEXT PRIMARY KEY,
  streak INTEGER NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_topics (
  user_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, topic_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_states_user ON user_states(user_id);
CREATE INDEX IF NOT EXISTS idx_user_states_topic ON user_states(user_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_user_topics_user ON user_topics(user_id);

CREATE TABLE IF NOT EXISTS user_questions (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category_title TEXT,
  category_level TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_questions_user ON user_questions(user_id);

