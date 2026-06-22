# Commit Voice

An AI agent that turns your GitHub commits into social media posts — and publishes them directly to X/Twitter and LinkedIn. Built on the [Eve](https://vercel.com/blog/introducing-eve) framework by Vercel.

## What It Does

Every day at 6 PM UTC, Commit Voice:
1. Fetches your latest public GitHub commits via the GitHub Events API
2. Filters out trivial commits (typos, merges, bumps, WIP) using 8 regex patterns
3. Generates an X/Twitter post (casual, ≤280 chars) and a LinkedIn post (professional, problem/solution framing)
4. Saves them as "pending" to Neon DB
5. Notifies you via Slack with a link to the dashboard
6. You review, approve, or reject via the web dashboard
7. Approved posts are published directly to X/Twitter and LinkedIn

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Vercel                                   │
│                                                              │
│  Cron (6 PM UTC)                                             │
│    → daily-posts.ts (schedule handler)                       │
│      → GitHub Events API (fetch commits)                     │
│      → Filter trivial commits (8 regex patterns)             │
│      → LLM generates posts (owl-alpha via OpenRouter)        │
│      → Save to Neon DB (status: pending)                     │
│      → Notify Slack with dashboard link                      │
│                                                              │
│  Next.js Dashboard (/dashboard)                              │
│    → Fetch pending posts from Neon DB                        │
│    → Show with Post / Reject buttons                         │
│    → On Post: agent posts to X + LinkedIn via APIs          │
│    → On Reject: mark as rejected in Neon DB                  │
│                                                              │
│  Neon DB (PostgreSQL)                                        │
│    → posts table: id, content, platform, status, timestamps │
│    → status: pending → posted / rejected                     │
│                                                              │
│  Eve Agent (mounted via withEve())                           │
│    → HTTP channel for API access                             │
│    → Tools: post-to-twitter, post-to-linkedin                │
│    → Schedule: daily-posts.ts                               │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
commit-voice/
├── agent/                          # Eve agent
│   ├── agent.ts                    # Model config (defineAgent)
│   ├── instructions.md             # System prompt (always loaded)
│   ├── channels/
│   │   ├── eve.ts                 # HTTP channel (for API/TUI access)
│   │   └── slack.ts               # Slack notifications (Vercel Connect)
│   ├── tools/
│   │   ├── fetch-github-commits.ts # GitHub Events API tool
│   │   ├── get-env-vars.ts        # Read env vars from runtime
│   │   ├── post-to-twitter.ts     # Twitter API v2 posting
│   │   └── post-to-linkedin.ts     # LinkedIn UGC Posts API
│   ├── skills/
│   │   ├── dev-skill.md           # Eve development troubleshooting
│   │   └── post-generation.md     # Post writing guidelines
│   └── schedules/
│       └── daily-posts.ts         # Daily cron handler (6 PM UTC)
├── app/                            # Next.js App Router
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Landing page
│   ├── not-found.tsx              # 404 page
│   ├── globals.css                # Global styles (dark theme)
│   ├── dashboard/
│   │   ├── page.tsx               # Dashboard with Post/Reject UI
│   │   ├── PostCard.tsx           # Post card component
│   │   ├── loading.tsx            # Loading skeleton
│   │   └── error.tsx              # Error boundary
│   └── api/
│       └── posts/
│           ├── route.ts            # GET posts (filter by status)
│           └── [id]/
│               ├── approve/route.ts # POST approve → publish
│               └── reject/route.ts  # POST reject
├── lib/                            # Shared code
│   ├── db.ts                       # Neon DB connection + queries
│   ├── schema.sql                  # Posts table schema
│   └── social.ts                   # Twitter/LinkedIn API helpers
├── next.config.ts                  # withEve() wrapper
├── package.json
├── tsconfig.json
├── .npmrc                          # legacy-peer-deps=true
├── .env.example
└── .gitignore
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Eve 0.12.0 (Vercel) + Next.js 14 |
| Language | TypeScript + Markdown |
| Model | owl-alpha via OpenRouter |
| Database | Neon DB (serverless PostgreSQL) |
| GitHub | GitHub REST API (Events) |
| Slack | Vercel Connect |
| Twitter | Twitter API v2 (twitter-api-v2) |
| LinkedIn | LinkedIn UGC Posts API |
| Scheduling | Vercel Cron Jobs (UTC) |
| Node.js | 24.x |

## Setup

### Prerequisites

- Node.js 18+ (Vercel builds with Node 24 automatically)
- Vercel CLI (`npm i -g vercel`)
- GitHub Personal Access Token (public_repo scope)
- OpenRouter API key
- Slack workspace
- Neon DB account (free tier)
- Twitter Developer App with write access
- LinkedIn Developer App with `w_member_social` scope

### Quick Start

```bash
# 1. Clone and install
git clone https://github.com/anusbutt/commit-voice.git
cd commit-voice
npm install --legacy-peer-deps

# 2. Set up Neon DB
# Go to https://neon.tech, create a project, run the SQL from lib/schema.sql

# 3. Configure environment
cp .env.example .env
# Edit .env with your values

# 4. Set up Slack via Vercel Connect
vercel connect create slack --triggers
vercel connect attach <uid> --triggers --trigger-path /eve/v1/slack --yes

# 5. Deploy
vercel deploy --prod

# 6. Set env vars in Vercel
vercel env add GITHUB_TOKEN
vercel env add GITHUB_USERNAME
vercel env add SLACK_CHANNEL_ID
vercel env add OPENROUTER_API_KEY
vercel env add DATABASE_URL
vercel env add TWITTER_API_KEY
vercel env add TWITTER_API_SECRET
vercel env add TWITTER_ACCESS_TOKEN
vercel env add TWITTER_ACCESS_SECRET
vercel env add LINKEDIN_PERSON_ID
vercel env add LINKEDIN_ACCESS_TOKEN

# 7. Redeploy with env vars
vercel deploy --prod
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub Personal Access Token (public_repo scope) |
| `GITHUB_USERNAME` | Yes | Your GitHub username |
| `SLACK_CHANNEL_ID` | Yes | Slack channel ID for notifications |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key |
| `DATABASE_URL` | Yes | Neon DB connection string |
| `TWITTER_API_KEY` | Yes | Twitter App Consumer Key |
| `TWITTER_API_SECRET` | Yes | Twitter App Consumer Secret |
| `TWITTER_ACCESS_TOKEN` | Yes | Twitter App Access Token |
| `TWITTER_ACCESS_SECRET` | Yes | Twitter App Access Token Secret |
| `LINKEDIN_PERSON_ID` | Yes | Your LinkedIn Person ID |
| `LINKEDIN_ACCESS_TOKEN` | Yes | LinkedIn OAuth 2.0 Access Token |

## Usage

### Dashboard

Visit `https://your-app.vercel.app/dashboard` to see pending posts. Click **Post** to publish to X/Twitter or LinkedIn. Click **Reject** to skip.

### Interactive Chat (TUI)

```bash
npx eve dev https://commit-voice.vercel.app
```

### HTTP API

```bash
# Start a session
curl -X POST https://commit-voice.vercel.app/eve/v1/session \
  -H 'content-type: application/json' \
  -d '{"message":"Hello"}'

# Get posts
curl https://commit-voice.vercel.app/api/posts?status=pending

# Approve a post (publishes to platform)
curl -X POST https://commit-voice.vercel.app/api/posts/1/approve

# Reject a post
curl -X POST https://commit-voice.vercel.app/api/posts/1/reject
```

### Daily Cron

The schedule fires automatically at 6 PM UTC. Posts are saved as pending for dashboard review.

## Key Design Decisions

1. **Human approval required** — Posts must be explicitly approved via the dashboard before publishing (constitution principle)
2. **Direct OpenRouter provider** — Bypasses Vercel AI Gateway for model flexibility
3. **Neon DB for persistence** — Survives serverless cold starts, unlike file-based storage
4. **Next.js + Eve via withEve()** — Single deployment for both frontend and agent
5. **Separate tools per platform** — Twitter and LinkedIn have different auth mechanisms

## License

Apache-2.0
