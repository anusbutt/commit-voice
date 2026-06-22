---
name: dev-skill
description: "Eve framework build and development troubleshooting guide. Use when: building an eve agent, facing build errors, setting up tools/channels/schedules, configuring models, resolving dependency conflicts, deploying to Vercel, or anything related to eve agent development. This skill prevents the most common pitfalls encountered when building Eve agents."
---

# Eve Development Skill

A battle-tested guide for building, debugging, and deploying Eve framework agents. Covers dependency compatibility, model routing, build configuration, and common errors with their fixes.

## Architecture Overview

Eve is a filesystem-first agent framework. The directory structure IS the architecture:

```
agent/
├── agent.ts          # Model config (defineAgent)
├── instructions.md   # System prompt (always-on)
├── tools/            # TypeScript files (defineTool + Zod 4 schema)
├── skills/           # Markdown files (YAML frontmatter)
├── channels/         # HTTP, Slack, Discord adapters
├── schedules/        # Cron-triggered runs (defineSchedule)
└── connections/      # MCP servers, OpenAPI
```

**Key principle:** File location defines function. No `name` or `id` fields on `define*` calls.

## Dependency Compatibility Matrix

This is the #1 source of build failures. Eve's internal dependencies are strict.

### Zod: Version 4 ONLY

Eve's compiler reads `~standard.jsonSchema.input()` from Zod schemas. This only exists in Zod 4.

```ts
// ✅ CORRECT — Zod 4
import { z } from "zod";
inputSchema: z.object({ city: z.string() })

// ❌ WRONG — Zod 3 causes "Cannot read properties of undefined (reading 'input')"
import { z } from "zod";
inputSchema: z.object({ city: z.string() })
```

**How to check:** `node -e "console.log(require('zod/package.json').version)"` — must be 4.x

**Fix:** `npm install zod@4`

### AI SDK: Version 7

Eve bundles `ai@7`. Any provider package must be compatible with this.

```ts
// ✅ CORRECT — Provider with no ai peer dependency
import { openrouter } from "@openrouter/ai-sdk-provider";

// ❌ WRONG — Provider requiring ai@6 causes build failure
import { someProvider } from "@some/old-provider";
```

**How to check:** `node -e "console.log(require('ai/package.json').version)"` — must be 7.x

**Fix:** Use provider versions that don't peer-depend on ai, or match Eve's ai version.

### Node.js: Version 24+

Eve requires Node 24. Vercel defaults to 22.

**Fix:** Add to `package.json`:
```json
{
  "engines": { "node": "24.x" }
}
```

### npm Peer Dependencies

When installing packages that conflict with Eve's dependencies:

```bash
npm install <package> --legacy-peer-deps
```

## Model Routing

### Option 1: Vercel AI Gateway (string model ID)

```ts
// agent/agent.ts
import { defineAgent } from "eve";
export default defineAgent({
  model: "anthropic/claude-opus-4.8",
});
```

Works with built-in providers: `anthropic/`, `openai/`, `google/`, etc.

**Does NOT work with:** Custom providers like `openrouter/` unless configured in Vercel AI Gateway dashboard (which has no custom provider option as of 2026).

### Option 2: Direct Provider (LanguageModel object)

```ts
// agent/agent.ts
import { openrouter } from "@openrouter/ai-sdk-provider";
import { defineAgent } from "eve";
export default defineAgent({
  model: openrouter("owl-alpha"),
  modelContextWindowTokens: 1048756,
});
```

**Key fields for direct providers:**
- `modelContextWindowTokens` — Required when the model isn't in Eve's catalog. Get it from the provider's API.
- `modelOptions.providerOptions` — For passing API keys or other provider-specific options.

**How to find context window:** Check the provider's API docs or model catalog.

### Checking What Works

```bash
# Test build locally with your model
OPENROUTER_API_KEY=your_key npx eve build
```

## Build Configuration

### .npmrc

Always include this to avoid peer dependency conflicts:

```
legacy-peer-deps=true
```

### .gitignore

```
.env
.env.local
node_modules/
.eve/
.vercel/
.output/
.claude/
```

### Environment Variables

Env vars are available in **schedule handlers** and **tool execute** (runtime context), but NOT in:
- Bash tool (runs in sandbox)
- LLM context (the model can't read process.env directly)

**Pattern:** Create a `get-env-vars` tool if the LLM needs to read env vars:

```ts
// agent/tools/get-env-vars.ts
import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "Read environment variables from the runtime",
  inputSchema: z.object({
    keys: z.array(z.string()),
  }),
  async execute({ keys }) {
    const result = {};
    for (const key of keys) {
      result[key] = process.env[key] || "(not set)";
    }
    return result;
  },
});
```

## YAML Frontmatter Rules

Skills use YAML frontmatter. Colons in values break parsing.

```yaml
# ❌ WRONG — colon breaks YAML
description: Use when: generating posts, writing content

# ✅ CORRECT — quote the value
description: "Use when: generating posts, writing content"
```

**Rule:** If your description or any YAML value contains a colon, wrap it in double quotes.

## Tool Definition Pattern

Every tool must have: `description`, `inputSchema` (Zod 4), and `execute`.

```ts
import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "What this tool does. Include trigger keywords.",
  inputSchema: z.object({
    paramName: z.string().describe("Parameter description"),
    optionalParam: z.number().optional().describe("Optional param"),
  }),
  async execute({ paramName, optionalParam }) {
    // Access env vars via process.env (runtime context)
    const token = process.env.MY_TOKEN;
    if (!token) throw new Error("MY_TOKEN not set");
    return { result: "..." };
  },
});
```

**Important:** Tools run in the **app runtime**, not the sandbox. They have access to `process.env`.

## Schedule Handler Pattern

Schedules run in the **root-only** context (not subagents). They have access to `receive`, `waitUntil`, and `appAuth`.

```ts
import { defineSchedule } from "eve/schedules";
import slack from "../channels/slack.js";

export default defineSchedule({
  cron: "0 18 * * *", // 6 PM UTC
  async run({ receive, waitUntil, appAuth }) {
    const username = process.env.GITHUB_USERNAME!;
    const channelId = process.env.SLACK_CHANNEL_ID!;

    // Do work (fetch APIs, compute, etc.)
    const data = await fetchSomething(username);

    // Send to Slack
    waitUntil(
      receive("slack", {
        message: `Here's your data: ${data}`,
        target: { channelId },
        auth: appAuth,
      })
    );
  },
});
```

**Key points:**
- `receive(channel, { message, target, auth })` — sends to a channel
- `waitUntil(promise)` — keeps cron task alive for async work
- `appAuth` — pre-built auth principal for agent-owned work

## Channel Setup

### Slack via Vercel Connect

```ts
// agent/channels/slack.ts
import { connectSlackCredentials } from "@vercel/connect/eve";
import { slackChannel } from "eve/channels/slack";

export default slackChannel({
  credentials: connectSlackCredentials("slack/your-agent-name"),
});
```

**Setup steps:**
1. `vercel connect create slack --triggers`
2. `vercel connect attach <uid> --triggers --trigger-path /eve/v1/slack --yes`
3. Authorize in Slack workspace

### HTTP Channel (for API access)

```ts
// agent/channels/eve.ts
import { eveChannel } from "eve/channels/eve";
import { none } from "eve/channels/auth";

export default eveChannel({
  auth: [none()], // or localDev(), vercelOidc(), jwtHmac()
});
```

**Auth options:**
- `none()` — No auth (for testing only)
- `localDev()` — Allows localhost requests
- `vercelOidc()` — Vercel-to-Vercel auth
- `jwtHmac(secret)` — Custom JWT auth

## Common Errors and Fixes

### "Cannot read properties of undefined (reading 'input')"

**Cause:** Zod 3 vs 4 incompatibility, or incompatible provider package.

**Fix:**
```bash
npm install zod@4
# Check ai version matches Eve's requirement
node -e "console.log(require('ai/package.json').version)"
# If using a provider, ensure it's compatible with Eve's ai version
```

### "Cannot resolve package '@vercel/connect/eve'"

**Cause:** Missing Vercel Connect dependency.

**Fix:**
```bash
npm install @vercel/connect --legacy-peer-deps
```

### "GatewayModelNotFoundError: Model 'xxx' not found"

**Cause:** Vercel AI Gateway doesn't recognize the model ID.

**Fix:** Use a direct provider LanguageModel instead of a string:
```ts
import { provider } from "@provider/ai-sdk-provider";
export default defineAgent({
  model: provider("model-id"),
  modelContextWindowTokens: <tokens>,
});
```

### "Invalid authored skill frontmatter"

**Cause:** YAML parsing error (usually unquoted colon in value).

**Fix:** Wrap the value in double quotes:
```yaml
description: "Your description with: colons"
```

### "eve requires Node.js >=24"

**Cause:** Vercel or local environment using Node 22.

**Fix:** Add to `package.json`:
```json
{
  "engines": { "node": "24.x" }
}
```

### Agent asks for env vars in TUI

**Cause:** LLM runs in sandbox, can't read `process.env` directly.

**Fix:** Create a `get-env-vars` tool (see above) or pass values in the prompt.

### "Cannot read properties of undefined (reading 'map')"

**Cause:** Usually a Zod or AI SDK version mismatch. Same as the 'input' error.

**Fix:** Check Zod and AI SDK versions, ensure compatibility.

## Build and Deploy Workflow

### Local Build Test

```bash
# Set required env vars
export OPENROUTER_API_KEY=your_key  # if using OpenRouter
npx eve build
```

### Deploy to Vercel

```bash
# First time
npx eve@latest init .
npm install
vercel connect create slack --triggers  # if using Slack
vercel deploy

# Set env vars
vercel env add GITHUB_TOKEN
vercel env add GITHUB_USERNAME
vercel env add SLACK_CHANNEL_ID

# Redeploy
vercel deploy --prod
```

### Verify Deployment

```bash
# Health check
curl https://your-app.vercel.app/eve/v1/health

# Test session
curl -X POST https://your-app.vercel.app/eve/v1/session \
  -H 'content-type: application/json' \
  -d '{"message":"Hello"}'
```

## Quick Debugging Checklist

When `eve build` fails:

1. [ ] Check Zod version: `node -e "console.log(require('zod/package.json').version)"` → must be 4.x
2. [ ] Check AI SDK version: `node -e "console.log(require('ai/package.json').version)"` → must be 7.x
3. [ ] Check Node version: `node --version` → must be 24+
4. [ ] Check for missing packages: `npm install @vercel/connect --legacy-peer-deps`
5. [ ] Check YAML frontmatter for unquoted colons
6. [ ] Check model string is recognized or use direct provider
7. [ ] Ensure `.npmrc` has `legacy-peer-deps=true`
8. [ ] Check `package.json` has `"engines": { "node": "24.x" }`

---

## Complete Eve CLI Command Reference

### `eve init` — Create a new agent

```bash
# Initialize in current directory
npx eve init .

# Initialize a new project folder
npx eve init my-agent

# With web chat (Next.js frontend)
npx eve init . --channel-web-nextjs
```

### `eve dev` — Development server

```bash
# Start local dev server
npx eve dev

# Connect to a deployed agent
npx eve dev https://your-app.vercel.app

# Custom port
npx eve dev --port 4000

# Without interactive UI (headless)
npx eve dev --no-ui

# Pre-fill a message
npx eve dev --input "Hello"

# Control tool/reasoning visibility
npx eve dev --tools collapsed --reasoning hidden
```

### `eve build` — Build for production

```bash
npx eve build
```

Writes output to `.output/` (local) or `.vercel/output/` (when `VERCEL` env is set).

### `eve start` — Run a built agent

```bash
# Requires eve build first
npx eve start
npx eve start --port 3000 --host 0.0.0.0
```

### `eve deploy` — Deploy to Vercel

```bash
# Links project and deploys
npx eve deploy

# Deploy to production
npx eve deploy --prod
```

### `eve link` — Link to Vercel + pull AI Gateway credentials

```bash
npx eve link
```

### `eve info` — Print resolved application info

```bash
npx eve info
npx eve info --json
```

Shows: model, tools, skills, channels, schedules, and discovery diagnostics.

### `eve channels` — Manage channels

```bash
# List channels
npx eve channels list

# Add a channel interactively
npx eve channels add

# Add specific channel types
npx eve channels add slack
npx eve channels add web
```

### `eve eval` — Run evaluation tests

```bash
# Run all evals
npx eve eval

# Run specific evals
npx eve eval eval-name

# Run against remote agent
npx eve eval --url https://your-app.vercel.app

# Filter by tag
npx eve eval --tag smoke

# Verbose output
npx eve eval --verbose

# JSON output
npx eve eval --json

# JUnit report
npx eve eval --junit results.xml

# Strict mode (fail on low scores)
npx eve eval --strict

# List evals without running
npx eve eval --list
```

### `vercel connect` — Manage external service connections

```bash
# List connections
vercel connect list

# Create a new connection
vercel connect create slack --triggers

# Attach to project
vercel connect attach <uid> --triggers --trigger-path /eve/v1/slack --yes

# Detach
vercel connect detach <uid> --yes

# Remove
vercel connect remove <uid> --yes
```
