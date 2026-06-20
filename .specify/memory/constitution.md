<!--
  Sync Impact Report
  Version change: N/A (initial) -> 1.0.0
  Modified principles: N/A (initial creation)
  Added sections: Core Principles (5), Development Workflow, Governance
  Removed sections: None
  Templates requiring updates: None (initial)
  Follow-up TODOs: None
-->

# Commit Voice Constitution

## Core Principles

### I. Eve-First Architecture
Every feature MUST be built as a native Eve framework artifact (agent.ts, tools/, skills/, channels/, schedules/, connections/). Standalone scripts or non-Eve wrappers are NOT allowed unless explicitly justified as an integration bridge. The agent directory structure IS the architecture — file location defines function, and the path gives identity.

### II. Spec-Driven Development (NON-NEGOTIABLE)
No code or artifact is written without a preceding spec. The cycle is: constitution -> spec -> plan -> tasks -> implement. Each phase MUST be validated by the orchestrator before the next begins. If gaps are discovered during implementation, artifacts MUST be updated before proceeding. Specs are the source of truth, not the code.

### III. Output Quality Over Code Coverage
This project generates social media posts — the quality of output matters more than traditional test coverage. Validation focuses on: post relevance (does it reflect real commits?), platform fit (is the tone right for X vs LinkedIn?), and delivery reliability (does Slack receive the posts?). Lightweight validation gates replace heavy TDD.

### IV. Human-in-the-Loop at Defined Checkpoints
The orchestrator MUST stop for validation after every phase (constitution, spec, plan, tasks). The agent MUST NOT self-approve or skip validation. Automated posting to X/LinkedIn is explicitly excluded from v1 — posts go to Slack for human review first. Any change to this gate requires a constitution amendment.

### V. Simplicity and Single Responsibility
Each tool does one thing. Each schedule handles one workflow. Each skill covers one domain. No multi-purpose tools, no monolithic schedules. If a file would exceed ~100 lines or handle more than one concern, split it. YAGNI applies — do not build features not explicitly in the spec.

## Technology Stack

- **Runtime**: Eve framework (latest) on Vercel
- **Language**: TypeScript (tools, schedules, channels, connections) + Markdown (instructions, skills)
- **Model**: owl-alpha via OpenRouter
- **Integrations**: GitHub REST API (commits), Slack (post delivery via Vercel Connect)
- **Scheduling**: Eve schedules (Vercel Cron Jobs, UTC)
- **Deployment**: Vercel (zero-config from Eve)

## Development Workflow

1. **Constitution** — Establish principles (this document). Must be ratified before any spec.
2. **Spec** — Define user stories with priorities, acceptance scenarios, and requirements. Written to `specs/<feature>/spec.md`.
3. **Plan** — Architecture decisions, project structure, constitution check. Written to `specs/<feature>/plan.md`.
4. **Tasks** — Actionable, traceable tasks grouped by user story. Written to `specs/<feature>/tasks.md`.
5. **Implement** — Execute tasks. If gaps found, update artifacts first.
6. **Validate** — Verify output quality and delivery. Create PHR.

Every user message MUST generate a Prompt History Record (PHR) in `history/prompts/`. Architectural decisions MUST be flagged with ADR suggestion — never auto-created.

## Governance

- This constitution supersedes all other practices and informal conventions.
- Amendments require: documentation of the change, version bump (semver), sync impact report, and orchestrator approval.
- All PRs/reviews MUST verify compliance with principles I (Eve-First) and II (Spec-Driven).
- Complexity MUST be justified — if a simpler alternative exists that meets the spec, it MUST be chosen.
- Runtime development guidance lives in CLAUDE.md and is subordinate to this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-06-21 | **Last Amended**: 2026-06-21
