# Quickstart: Social Media Agent

**Branch**: `001-social-media-agent` | **Date**: 2026-06-21

## Prerequisites

- Node.js 18+ installed
- Vercel CLI installed (`npm i -g vercel`)
- A GitHub account with public repos
- A Slack workspace where you can create channels

## Setup

### 1. Install dependencies

```bash
cd commit-voice
npm install
```

### 2. Configure environment variables

Create a `.env.local` file:

```bash
# GitHub
GITHUB_TOKEN=ghp_xxxxxxxxxxxx          # Personal Access Token (public_repo scope)
GITHUB_USERNAME=your-username

# Slack
SLACK_CHANNEL_ID=C0123ABC             # Target channel for post delivery
```

### 3. Generate GitHub Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scope: `public_repo` (read-only access to public repos)
4. Generate and copy the token

### 4. Set up Slack via Vercel Connect

```bash
vercel connect
# Select Slack from the list
# Authorize the app in your Slack workspace
# This auto-configures Slack credentials
```

### 5. Get Slack Channel ID

1. Open Slack in browser
2. Navigate to your target channel
3. The URL contains the channel ID: `https://app.slack.com/client/T0123ABC/C0123ABC`
4. Copy the channel ID (the `C...` part)

### 6. Deploy

```bash
VERCEL_USE_EXPERIMENTAL_FRAMEWORKS=1 vercel deploy --prod
```

This deploys the agent to Vercel and registers the cron job automatically.

## Verification

### Local development

```bash
npm run dev
# Opens the Eve TUI
# Trigger the schedule manually:
curl -X POST http://localhost:3000/eve/v1/dev/schedules/daily-posts
```

### Production verification

1. Go to Vercel dashboard → your project → Cron Jobs
2. Verify the `daily-posts` schedule appears with cron `0 18 * * *`
3. Click "Run" to trigger a test run
4. Check your Slack channel for the generated posts

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No commits today" every run | Check that your repos are public and you have recent commits |
| Slack not receiving messages | Verify `SLACK_CHANNEL_ID` is correct and Vercel Connect is configured |
| GitHub API errors | Check that `GITHUB_TOKEN` is valid and has `public_repo` scope |
| Posts are low quality | The LLM model can be changed in `agent/agent.ts` — try a higher-tier model |
