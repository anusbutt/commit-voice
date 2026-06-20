# Tasks: Social Media Agent

**Input**: Design documents from `/specs/001-social-media-agent/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: No test tasks — this is an Eve agent project. Validation is done through output quality checks (post content review in Slack) rather than unit tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- All agent code: `agent/` at repository root
- Tools: `agent/tools/`
- Skills: `agent/skills/`
- Channels: `agent/channels/`
- Schedules: `agent/schedules/`
- Config: `agent/agent.ts`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the Eve project with correct structure and dependencies

- [ ] T001 Run `npx eve@latest init commit-voice` to scaffold the project — this creates `package.json`, `tsconfig.json`, `agent/` directory with `agent.ts`, `instructions.md`, `tools/`, `skills/`, `channels/`, `schedules/` stubs
- [ ] T002 Update scaffolded `package.json` to ensure dependencies: `eve` (latest), `zod` (^3.23), and devDeps: `typescript` (^5.5)
- [ ] T003 Create `.env.example` documenting: `GITHUB_TOKEN`, `GITHUB_USERNAME`, `SLACK_CHANNEL_ID`
- [ ] T004 Update scaffolded `agent/agent.ts` to set model to `openrouter/owl-alpha`
- [ ] T005 Update scaffolded `agent/instructions.md` with system prompt: identity as social media assistant, standing rules (skip trivial commits, match tone to platform, never leak sensitive info), post style guidelines for X and LinkedIn

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 [P] Create `agent/channels/slack.ts` with `slackChannel()` configuration using Vercel Connect credentials
- [ ] T007 [P] Create `agent/tools/fetch-github-commits.ts` — defineTool with Zod schema `{ username, since?, per_page? }`, fetches from GitHub Events API `/users/{username}/events/public`, filters to PushEvents, returns structured commit array `{ sha, message, repo, date, url }`
- [ ] T008 [P] Create `agent/skills/skill-creator.md` — defines the standard process for creating any skill: YAML frontmatter format, description writing, trigger keywords, body structure with guidelines and examples. This is the FIRST skill and must be built before all others.
- [ ] T009 [P] Create `agent/skills/post-generation.md` — built using the skill-creator process. Contains: commit classification rules (what to feature vs skip), writing guidelines for X and LinkedIn with concrete examples, tone rules

**Checkpoint**: Foundation ready — Eve project structure complete, GitHub tool working, Slack channel configured, skill-creator and post-generation skill in place

---

## Phase 3: User Story 1 - Daily Post Generation from Commits (Priority: P1) 🎯 MVP

**Goal**: The agent fetches GitHub commits daily and generates both X and LinkedIn posts

**Independent Test**: Trigger the daily schedule, verify posts appear in Slack referencing actual recent commits, confirm both X and LinkedIn variants are present

### Implementation for User Story 1

- [ ] T010 [US1] Create `agent/schedules/daily-posts.ts` using `defineSchedule` with cron `0 18 * * *` (6 PM UTC) in handler mode (`run` function)
- [ ] T011 [US1] Implement the schedule handler flow in `daily-posts.ts`:
  - Step 1: Fetch GitHub events via REST API with `GITHUB_TOKEN` auth
  - Step 2: Filter to PushEvents, extract commits with `{ sha, message, repo, date, url }`
  - Step 3: Apply trivial-commit filter (regex: merge, bump, typo, dependency, readme)
  - Step 4: If no meaningful commits → send "no commits today" to Slack via `receive("slack", ...)` and return
  - Step 5: Build LLM prompt with commit summary + platform-specific instructions + JSON output format
  - Step 6: Send prompt to agent LLM, receive structured JSON `{ twitter: {...}, linkedin: {...} }`
  - Step 7: Format and deliver both posts to Slack via `receive("slack", { message, target, auth })`
- [ ] T012 [US1] Add error handling in schedule: GitHub API failure → report to Slack; Slack delivery failure → log clearly; rate limiting → report to Slack
- [ ] T013 [US1] Add `waitUntil()` calls for all async `receive()` operations to keep cron task alive

**Checkpoint**: At this point, triggering the schedule should fetch commits, generate posts, and deliver them to Slack

---

## Phase 4: User Story 2 - Platform-Appropriate Post Style (Priority: P1)

**Goal**: X posts are casual and under 280 chars; LinkedIn posts are professional and detailed

**Independent Test**: Review generated posts in Slack — X post ≤ 280 chars with conversational tone; LinkedIn post has problem/solution framing

### Implementation for User Story 2

- [ ] T014 [P] [US2] Update the LLM prompt in `daily-posts.ts` (Step 5) to include explicit X/Twitter constraints: max 280 chars, first-person conversational tone, 1-2 hashtags max, mention repo or tech stack
- [ ] T015 [P] [US2] Update the LLM prompt in `daily-posts.ts` (Step 5) to include explicit LinkedIn constraints: max 3000 chars, professional tone, problem/solution framing, 3-5 hashtags, suitable for professional audience
- [ ] T016 [US2] Update `agent/skills/post-generation.md` with concrete "good" and "bad" example posts for each platform to guide the LLM
- [ ] T017 [US2] Update `agent/instructions.md` with platform style rules that are always loaded into context

**Checkpoint**: Generated posts should consistently match platform expectations — verify by reviewing 3+ runs in Slack

---

## Phase 5: User Story 3 - Slack Delivery for Review (Priority: P2)

**Goal**: Posts arrive in the correct Slack channel in a readable, formatted message

**Independent Test**: After a schedule run, the designated Slack channel receives a formatted message with header, X post section, LinkedIn post section, and repo metadata

### Implementation for User Story 3

- [ ] T018 [US3] Implement the Slack message formatting in `daily-posts.ts` (Step 7): header block ("Daily Social Media Posts"), X post section with label, LinkedIn post section with label, context footer with repo list and timestamp
- [ ] T019 [US3] Configure `SLACK_CHANNEL_ID` as the target in the schedule handler's `receive("slack", { target: { channelId } })` call
- [ ] T020 [US3] Add `appAuth` parameter to `receive()` calls for proper authentication via Vercel Connect

**Checkpoint**: Slack channel receives well-formatted messages with both post variants and metadata

---

## Phase 6: User Story 4 - Commit Quality Filtering (Priority: P2)

**Goal**: Trivial commits (typos, bumps, merges) are excluded from post generation

**Independent Test**: Run with a mix of trivial and meaningful commits — generated posts only reference meaningful ones

### Implementation for User Story 4

- [ ] T021 [US4] Implement regex-based trivial commit filter in `daily-posts.ts` (Step 3): exclude commits matching `/^merge/i`, `/^bump/i`, `/^fix typo/i`, `/^update dependency/i`, `/^readme/i`, `/^wip/i`
- [ ] T022 [US4] Add cap of 15 commits per run — if more meaningful commits exist, select the most impactful ones (prioritize: repos with multiple commits, specific/descriptive messages, diverse repos)
- [ ] T023 [US4] Update `agent/skills/post-generation.md` with the full list of trivial commit patterns and guidance on what constitutes a "meaningful" commit

**Checkpoint**: No generated post contains phrases like "fixed typo", "bumped version", or "merged branch"

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements that affect multiple user stories

- [ ] T024 [P] Add `.gitignore` entry for `.env` and `node_modules/`
- [ ] T025 [P] Add `.claude/` to `.gitignore` to prevent credential leakage (per speckitplus security guidance)
- [ ] T026 Validate all PHR files are created and have no unresolved placeholders
- [ ] T027 Verify the `agent/` directory structure is valid Eve format (check that defineAgent, defineTool, defineSchedule, slackChannel patterns are correct)
- [ ] T028 [P] Create `README.md` at project root with project overview, setup link to quickstart.md, and architecture summary

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (Phase 3) is the MVP — must be complete first
  - US2 (Phase 4) and US3 (Phase 5) enhance US1 — can proceed in parallel after US1
  - US4 (Phase 6) adds filtering improvements — can proceed in parallel with US2/US3
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — No dependencies on other stories
- **US2 (P1)**: Can start after Foundational — Enhances US1 output but independently testable
- **US3 (P2)**: Can start after Foundational — Enhances US1 delivery but independently testable
- **US4 (P2)**: Can start after Foundational — Enhances US1 filtering but independently testable

### Parallel Opportunities

```bash
# After Foundational (Phase 2) is complete, launch US1:
Task T006 (slack channel) — can run in parallel with T007 (GitHub tool)
Task T008 (skill-creator) — must complete before T009 (post-generation)

# After US1 (Phase 3) is complete, launch US2, US3, US4 in parallel:
Task T014 (X prompt) || T015 (LinkedIn prompt) || T018 (Slack formatting) || T021 (commit filter)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Trigger schedule, verify posts appear in Slack
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy (MVP!)
3. Add User Story 2 + US3 + US4 in parallel → Test independently → Deploy
4. Polish → Final deploy

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- No traditional tests — validation is through output quality review in Slack
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
