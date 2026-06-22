-- Run this in Neon DB SQL editor to create the posts table

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('twitter', 'linkedin')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'rejected')),
  repo_name VARCHAR(255),
  commit_sha VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW(),
  posted_at TIMESTAMP NULL,
  error_message TEXT NULL,
  UNIQUE(commit_sha, platform)
);

CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
