-- Migration 002: Viewer Profiles, Watchlist, and Playback History
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT 'avatar-1',
  is_kids INTEGER NOT NULL DEFAULT 0,
  maturity_rating TEXT NOT NULL DEFAULT 'All',
  language TEXT NOT NULL DEFAULT 'en',
  pin_hash TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

CREATE TABLE IF NOT EXISTS profile_watchlist (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_title TEXT NOT NULL,
  item_data TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(profile_id, item_title)
);

CREATE INDEX IF NOT EXISTS idx_profile_watchlist_profile_id ON profile_watchlist(profile_id);

CREATE TABLE IF NOT EXISTS profile_playback_history (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_title TEXT NOT NULL,
  tmdb_id TEXT,
  season INTEGER NOT NULL DEFAULT 1,
  episode INTEGER NOT NULL DEFAULT 1,
  progress INTEGER NOT NULL DEFAULT 0,
  item_data TEXT,
  updated_at INTEGER NOT NULL,
  UNIQUE(profile_id, item_title)
);

CREATE INDEX IF NOT EXISTS idx_profile_playback_history_profile_id ON profile_playback_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_playback_history_updated_at ON profile_playback_history(updated_at);
