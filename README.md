# Commit Voice

An AI agent that turns your GitHub commits into social media posts. Built on the [Eve](https://vercel.com/blog/introducing-eve) framework by Vercel.

## What It Does

Every day at 6 PM UTC, Commit Voice:
1. Fetches your latest public GitHub commits via the GitHub Events API
2. Filters out trivial commits (typos, merges, bumps, WIP) using regex patterns
3. Generates an X/Twitter post (casual, ≤280 chars) and a LinkedIn post (professional, problem/solution framing)
4. Delivers both to your Slack channel for review and manual sharing

## Architecture

```
Vercel Cron (6 PM UTC)
  → agent/schedules/daily-posts.ts (handler)
    → GitHub Events API (fetch commits)
    → Filter trivial commits (8 regex patterns)
    → Build LLM prompt with commit data + platform guidelines
    → owl-alpha via OpenRouter generates posts
    → Deliver to Slack via Vercel Connect
```

### How the Schedule Handler Works

The schedule handler (`agent/schedules/daily-posts.ts`) runs in Eve's runtime context (not the LLM sandbox), so it can:
- Read `process.env` for configuration
- Make direct HTTP requests to GitHub's API
- Call `receive("slack", ...)` to deliver messages

The handler fetches commits, filters them, builds a prompt with platform-specific instructions, sends it to the LLM, and delivers the generated posts to Slack.

### Model Routing

This project uses **OpenRouter** with the `owl-alpha` model, bypassing Vercel AI Gateway:

```ts
// agent/agent.ts
import { openrouter } from "@openrouter/ai-sdk-provider";
import { defineAgent } from "eve";

export default defineAgent({
  model: openrouter("owl-alpha"),
  modelContextWindowTokens: 1048756,
});
```

Why not use Vercel AI Gateway? The gateway only recognizes built-in providers (`anthropic/`, `openai/`, etc.). To use custom providers like OpenRouter, you need a direct provider integration.

## Project Structure

```
commit-voice/
├── agent/
│   ├── agent.ts                    # Model config (defineAgent)
│   ├── instructions.md             # System prompt (always loaded)
│   ├── channels/
│   │   ├── eve.ts                 # HTTP channel (for API/TUI access)
│   │   └── slack.ts               # Slack delivery (Vercel Connect)
│   ├── tools/
│   │   ├── fetch-github-commits.ts # GitHub Events API tool (Zod 4 schema)
│   │   └── get-env-vars.ts        # Read env vars from runtime
│   ├── skills/
│   │   └── post-generation.md      # Post writing guidelines (YAML frontmatter)
│   └── schedules/
│       └── daily-posts.ts         # Daily cron handler (6 PM UTC)
├── package.json
├── tsconfig.json
├── .npmrc                         # legacy-peer-deps=true
├── .env.example
└── .gitignore
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Eve 0.12.0 (Vercel) |
| Language | TypeScript + Markdown |
| Model | owl-alpha via OpenRouter |
| OpenRouter Provider | @openrouter/ai-sdk-provider@6.0.0-alpha.1 |
| AI SDK | v7 (bundled with Eve) |
| Schema Validation | Zod 4 |
| GitHub Integration | GitHub REST API (Events) |
| Slack Integration | Vercel Connect |
| Scheduling | Vercel Cron Jobs (UTC) |
| Node.js | 24.x |

## Setup

### Prerequisites

- Node.js 18+ (Vercel builds with Node 24 automatically)
- Vercel CLI (`npm i -g vercel`)
- GitHub Personal Access Token (public_repo scope)
- OpenRouter API key
- Slack workspace

### Quick Start

```bash
# 1. Clone and install
# Note: --legacy-peer-deps is required because Eve framework has strict peer dependency requirements
# that conflict with some packages. The .npmrc file already includes this setting.
git clone https://github.com/anusbutt/commit-voice.git
cd commit-voice
npm install --legacy-peer-deps

# 2. Initialize Eve agent (optional, for new projects)
npx eve init .

# 3. Install additional dependencies
npm install zod@4 --legacy-peer-deps
npm install @openrouter/ai-sdk-provider@6.0.0-alpha.1 --legacy-peer-deps
npm install @vercel/connect --legacy-peer-deps

# 4. Configure environment
cp .env.example .env
# Edit .env with your values:
#   GITHUB_TOKEN=ghp_xxxx
#   GITHUB_USERNAME=your-username
#   SLACK_CHANNEL_ID=C0XXXXXXX
#   OPENROUTER_API_KEY=sk-or-v1-xxxx

# 5. Set up Slack via Vercel Connect
vercel connect create slack --triggers
vercel connect attach <uid> --triggers --trigger-path /eve/v1/slack --yes

# 6. Deploy
vercel deploy --prod

# 7. Set env vars in Vercel
vercel env add GITHUB_TOKEN
vercel env add GITHUB_USERNAME
vercel env add SLACK_CHANNEL_ID
vercel env add OPENROUTER_API_KEY

# 8. Redeploy with env vars
vercel deploy --prod
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub Personal Access Token (public_repo scope) |
| `GITHUB_USERNAME` | Yes | Your GitHub username |
| `SLACK_CHANNEL_ID` | Yes | Slack channel ID (e.g., C0BBVV7VAFM) |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key |
| `DATABASE_URL` | Yes | Neon DB connection string |
| `DASHBOARD_PASSWORD` | Yes | Password for dashboard login |
| `NEXT_PUBLIC_APP_URL` | Yes | Your app URL (e.g., https://commit-voice.vercel.app) |
| `TWITTER_API_KEY` | Yes | Twitter App Consumer Key |
| `TWITTER_API_SECRET` | Yes | Twitter App Consumer Secret |
| `TWITTER_ACCESS_TOKEN` | Yes | Twitter App Access Token |
| `TWITTER_ACCESS_SECRET` | Yes | Twitter App Access Token Secret |
| `LINKEDIN_PERSON_ID` | Yes | Your LinkedIn Person ID |
| `LINKEDIN_ACCESS_TOKEN` | Yes | LinkedIn OAuth 2.0 Access Token (expires every 60 days — regenerate at https://developers.linkedin.com/) |

## Usage

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

# Stream response (use sessionId from above)
curl https://commit-voice.vercel.app/eve/v1/session/YOUR_SESSION_ID/stream
```

### Daily Cron

The schedule fires automatically at 6 PM UTC. No manual trigger needed.

To customize the schedule, edit `agent/schedules/daily-posts.ts`:
```ts
export default defineSchedule({
  cron: "0 18 * * *", // Change this
  // ...
});
```

Cron format: `minute hour day month day-of-week` (UTC).

## Development

### Build Locally

```bash
npx eve build
```

### Run Evals

```bash
npx eve eval
```

### Check Agent Info

```bash
npx eve info
```

## Key Design Decisions

1. **Direct OpenRouter provider** — Bypasses Vercel AI Gateway for model flexibility
2. **Zod 4 schemas** — Required by Eve's compiler for tool input validation
3. **Schedule handler does the work** — GitHub fetching and Slack delivery happen in runtime context, not the LLM sandbox
4. **get-env-vars tool** — LLM runs in sandbox and can't read `process.env` directly, so this tool bridges the gap
5. **Commit filtering** — 8 regex patterns filter trivial commits before generating posts

## License

Apache-2.0
