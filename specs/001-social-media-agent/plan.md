# Implementation Plan: Social Media Agent

**Branch**: `001-social-media-agent` | **Date**: 2026-06-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-social-media-agent/spec.md`

## Summary

Build an AI agent on the Eve framework that runs daily at 6 PM UTC, fetches the user's latest public GitHub commits via the GitHub Events API, filters out trivial commits, generates one X/Twitter post (casual, under 280 chars) and one LinkedIn post (professional, problem/solution framing), and delivers both to a designated Slack channel for human review before sharing.

## Technical Context

**Language/Version**: TypeScript (tools, schedules, channels) + Markdown (instructions, skills)
**Primary Dependencies**: Eve framework (latest), Zod (tool schemas)
**Storage**: N/A (stateless — each run fetches fresh data from GitHub)
**Testing**: Lightweight validation — post quality checks, Slack delivery verification (no unit tests; this is an agent project, not a traditional codebase)
**Target Platform**: Vercel (Eve's native deployment target)
**Project Type**: Single agent project — all code lives under `agent/` directory
**Performance Goals**: Agent completes within 5 minutes of schedule trigger (SC-001)
**Constraints**: Must use Eve-native artifacts only (FR-008); no standalone scripts; posts to Slack only in v1
**Scale/Scope**: Single user, single schedule, single channel; one agent directory with ~9 files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Eve-First Architecture | ✅ PASS | All features built as native Eve artifacts (tools/, schedules/, channels/, skills/) |
| II. Spec-Driven Development | ✅ PASS | Spec written and validated before this plan; tasks will follow |
| III. Output Quality Over Code Coverage | ✅ PASS | Validation focuses on post relevance, platform fit, delivery reliability |
| IV. Human-in-the-Loop | ✅ PASS | Orchestrator stops after every phase; posts go to Slack for review |
| V. Simplicity & Single Responsibility | ✅ PASS | Each tool does one thing; each file has one concern |

**Gate result**: ALL PASS — proceed to implementation.

## Project Structure

### Documentation (this feature)

```text
specs/001-social-media-agent/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/sp.plan output)
├── research.md          # Phase 0 output (minimal — tech choices known)
├── data-model.md        # Phase 1 output (entities from spec)
├── quickstart.md        # Phase 1 output (setup guide)
├── contracts/           # N/A — no REST APIs in this project
├── tasks.md             # Phase 2 output (/sp.tasks — NOT created by /sp.plan)
└── checklists/
    └── requirements.md  # Quality checklist (completed)
```

### Source Code (repository root)

```text
commit-voice/
├── package.json
├── tsconfig.json
├── .env.example
├── agent/
│   ├── agent.ts                    # Model config (owl-alpha via OpenRouter)
│   ├── instructions.md             # System prompt (always-on)
│   ├── tools/
│   │   └── fetch-github-commits.ts # GitHub Events API tool
│   ├── skills/
│   │   └── post-generation.md      # On-demand skill for post writing
│   ├── channels/
│   │   └── slack.ts               # Slack channel (Vercel Connect)
│   └── schedules/
│       └── daily-posts.ts         # Cron-triggered daily run (handler mode)
```

**Structure Decision**: Single Eve agent project. All source code lives under `agent/` following Eve's filesystem-first convention. No separate `src/` or `tests/` directories — Eve's `eve dev` and `vercel deploy` handle everything.

## Phase 0: Research

No significant unknowns remain. The technology choices are defined in the constitution:
- Eve framework (already explored in detail)
- GitHub REST API (well-documented, free with PAT)
- Slack via Vercel Connect (Eve's native channel support)
- Zod for tool schemas (Eve's standard)

A minimal `research.md` is generated for completeness.

## Phase 1: Design

### Data Model

See `data-model.md` — extracts the 3 entities from the spec (Commit, Post, Slack Message) with their attributes and relationships.

### Contracts

N/A — this project has no REST APIs. The agent communicates via Eve's internal tool/channel system, not HTTP endpoints.

### Agent Context

Eve's `agent.ts` configures the model. No additional agent context updates needed beyond the standard Eve setup.

## Complexity Tracking

> No Constitution Check violations — all 5 principles pass without justification needed.

## Implementation Notes

1. **GitHub API strategy**: Use the Events API (`/users/{username}/events/public`) rather than the Commits API. Events give chronological ordering across all repos. Filter to `PushEvent` only to get actual code commits.

2. **Post generation strategy**: The schedule handler builds a prompt with commit data, sends it to the agent's LLM, and receives structured JSON back. The LLM does the creative work; the schedule does the orchestration.

3. **Slack delivery strategy**: Use Eve's `receive("slack", { message, target, auth })` from the schedule handler. This is Eve's native proactive messaging pattern.

4. **Commit filtering**: Pattern-based filtering in the schedule handler (regex match against commit messages for "merge", "bump", "typo", etc.). The LLM also applies judgment for edge cases.

5. **Token budget**: Cap commits at 15 per run. Each commit summary is ~100 tokens, leaving ~3000 tokens for prompt instructions and LLM output. Well within Claude Sonnet's context window.
