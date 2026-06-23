# Commit Voice — Setup Guide

## Prerequisites

Before you start, make sure you have:

- **Node.js** 18+ installed
- **Vercel CLI** installed (`npm i -g vercel`)
- A **GitHub** account with public repos
- An **OpenRouter** account (https://openrouter.ai/keys)
- A **Neon DB** account (https://neon.tech, free tier works)
- A **Twitter Developer App** with write access
- A **LinkedIn Developer App** with `w_member_social` scope
- A **Slack workspace** (optional, for notifications)

---

## Step 1: Clone and Install

```bash
git clone https://github.com/anusbutt/commit-voice.git
cd commit-voice
npm install --legacy-peer-deps
```

---

## Step 2: Set Up Neon DB

1. Go to https://neon.tech and create a free account
2. Create a new project (name it `commit-voice`)
3. Copy the connection string (looks like `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require`)
4. Go to the SQL Editor in your Neon project
5. Run this SQL to create the posts table:

```sql
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
```

---

## Step 3: Set Up GitHub Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token"
3. Give it a name (e.g., `commit-voice`)
4. Select scope: `public_repo`
5. Generate and copy the token

---

## Step 4: Set Up OpenRouter

1. Go to https://openrouter.ai/keys
2. Create a new API key
3. Copy the key

---

## Step 5: Set Up Twitter API

1. Go to https://developer.twitter.com/en/portal
2. Create a new project and app
3. Enable **OAuth 1.0a** with **Read and Write** permissions
4. Generate these credentials:
   - API Key (Consumer Key)
   - API Secret (Consumer Secret)
   - Access Token
   - Access Token Secret

---

## Step 6: Set Up LinkedIn API

1. Go to https://developer.linkedin.com/
2. Create an app
3. Request `w_member_social` permission
4. Generate an OAuth 2.0 Access Token
5. Find your Person ID (found in your LinkedIn profile URL or via API)

---

## Step 7: Set Up Slack (Optional)

1. Go to your Slack workspace settings
2. Create a channel for notifications
3. Copy the Channel ID (found in channel settings → Channel ID)

---

## Step 8: Configure Environment

Create your `.env` file:

```bash
cp .env.example .env
```

Fill in your values:

```env
# GitHub
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_USERNAME=your-username

# Slack (optional)
SLACK_CHANNEL_ID=C0123ABC

# Neon DB
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require

# Dashboard
DASHBOARD_PASSWORD=your-secure-password
NEXT_PUBLIC_APP_URL=https://commit-voice.vercel.app

# OpenRouter
OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxx

# Twitter
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=

# LinkedIn
LINKEDIN_PERSON_ID=
LINKEDIN_ACCESS_TOKEN=
```

---

## Step 9: Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy (preview)
vercel deploy

# Deploy to production
vercel deploy --prod
```

---

## Step 10: Set Environment Variables on Vercel

```bash
# Neon DB
vercel env add DATABASE_URL

# Dashboard
vercel env add DASHBOARD_PASSWORD
vercel env add NEXT_PUBLIC_APP_URL

# GitHub
vercel env add GITHUB_TOKEN
vercel env add GITHUB_USERNAME

# OpenRouter
vercel env add OPENROUTER_API_KEY

# Slack (optional)
vercel env add SLACK_CHANNEL_ID

# Twitter
vercel env add TWITTER_API_KEY
vercel env add TWITTER_API_SECRET
vercel env add TWITTER_ACCESS_TOKEN
vercel env add TWITTER_ACCESS_SECRET

# LinkedIn
vercel env add LINKEDIN_PERSON_ID
vercel env add LINKEDIN_ACCESS_TOKEN
```

---

## Step 11: Redeploy

```bash
vercel deploy --prod
```

---

## Step 12: Verify

1. Visit `https://your-app.vercel.app/dashboard`
2. Enter your dashboard password
3. You should see the dashboard (empty at first)
4. Open the chat widget and say "hi"
5. Ask it to generate posts
6. Posts should appear on the Pending tab

---

## Troubleshooting

### "No recent commits found"
- Make sure you have public repos with recent commits
- Check that your GitHub token has `public_repo` scope
- Verify `GITHUB_USERNAME` is correct

### "Invalid password" on dashboard
- Check `DASHBOARD_PASSWORD` env var is set correctly
- Redeploy after setting env vars

### Chat returns 502
- Check `OPENROUTER_API_KEY` is set
- Check Vercel logs: `vercel logs --prod`
- Make sure Neon DB connection string is correct

### Posts not appearing after generation
- Check browser console for errors
- Make sure you're on the "Pending" tab
- Try refreshing the page

### Twitter/LinkedIn posting fails
- Verify API credentials are correct
- Check that your Twitter app has write permissions
- Check that your LinkedIn token has `w_member_social` scope

---

## Local Development

```bash
# Install dependencies
npm install --legacy-peer-deps

# Set up environment
cp .env.example .env
# Fill in your values

# Run development server
npm run dev

# Open http://localhost:3000/dashboard
```

---

## Project Architecture

```
GitHub Events API ──┐
                    ├──→ lib/github.ts ──→ /api/chat ──→ OpenRouter LLM ──→ Neon DB
GitHub Repos API ──┘                                           ↑
                                                               │
Eve Agent (cron) ──→ lib/github.ts ──→ LLM ───────────────────┘
                                                               │
Neon DB ──→ /api/posts ──→ Dashboard ──→ Twitter/LinkedIn APIs
```

---

## Support

- Issues: https://github.com/anusbutt/commit-voice/issues
- Eve Framework: https://vercel.com/blog/introducing-eve
- Neon DB: https://neon.tech/docs
- OpenRouter: https://openrouter.ai/docs
