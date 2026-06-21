# Commit Voice

An AI agent that turns your GitHub commits into social media posts. Built on the [Eve](https://vercel.com/blog/introducing-eve) framework by Vercel.

## What It Does

Every day at 6 PM UTC, Commit Voice:
1. Fetches your latest public GitHub commits
2. Filters out trivial stuff (typos, merges, bumps)
3. Generates an X/Twitter post (casual, ≤280 chars) and a LinkedIn post (professional, problem/solution framing)
4. Delivers both to Slack for you to review and share

## Architecture

```
Vercel Cron (6 PM UTC)
  → agent/schedules/daily-posts.ts (handler)
    → GitHub Events API (fetch commits)
    → Filter trivial commits (regex)
    → LLM prompt (owl-alpha via OpenRouter)
    → Generate X + LinkedIn posts
    → Deliver to Slack
```

## Project Structure

```
commit-voice/
├── agent/
│   ├── agent.ts              # Model config (owl-alpha)
│   ├── instructions.md       # System prompt (always-on)
│   ├── channels/
│   │   └── slack.ts         # Slack delivery channel
│   ├── tools/
│   │   └── fetch-github-commits.ts  # GitHub Events API tool
│   ├── skills/
│   │   ├── skill-creator/   # Eve's skill creation guide
│   │   └── post-generation.md # Post writing guidelines
│   └── schedules/
│       └── daily-posts.ts   # Daily cron handler (MVP)
├── specs/                    # Spec-driven development artifacts
├── package.json
├── tsconfig.json
└── .env.example
```

## Setup

See [specs/001-social-media-agent/quickstart.md](specs/001-social-media-agent/quickstart.md) for full setup instructions.

Quick start:

```bash
npx eve@latest init .
npm install
# Configure .env with GITHUB_TOKEN, GITHUB_USERNAME, SLACK_CHANNEL_ID
vercel deploy
```

## Tech Stack

- **Framework**: Eve (Vercel)
- **Language**: TypeScript + Markdown
- **Model**: owl-alpha via OpenRouter
- **Integrations**: GitHub REST API, Slack (Vercel Connect)
- **Scheduling**: Vercel Cron Jobs (UTC)

## Development

This project follows spec-driven development. All artifacts live under `specs/001-social-media-agent/`:

- `spec.md` — User stories and requirements
- `plan.md` — Architecture and technical decisions
- `tasks.md` — Actionable implementation tasks
- `research.md` — Technology decision rationale
- `data-model.md` — Entity definitions
- `quickstart.md` — Setup guide
