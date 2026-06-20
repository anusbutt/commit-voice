# Feature Specification: Social Media Agent

**Feature Branch**: `001-social-media-agent`
**Created**: 2026-06-21
**Status**: Draft
**Input**: User description: "Build an AI agent on the Eve framework that checks GitHub commits on a daily schedule, generates platform-specific social media posts (X/Twitter and LinkedIn), and delivers them to Slack for review"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Daily Post Generation from Commits (Priority: P1)

As an AI Engineer, I want the system to automatically check my GitHub commits every day and generate social media posts for both X/Twitter and LinkedIn, so that I can maintain a consistent online presence without manually writing posts.

**Why this priority**: This is the core value proposition — automated post generation from real work. Without this, the agent has no purpose.

**Independent Test**: Can be fully tested by triggering the daily schedule, verifying that posts appear in Slack that reference actual recent commits, and confirming both X and LinkedIn variants are present.

**Acceptance Scenarios**:

1. **Given** the daily schedule triggers at 6 PM UTC, **When** the agent fetches my recent GitHub commits, **Then** it generates one X/Twitter post and one LinkedIn post based on those commits and delivers them to Slack.
2. **Given** I have pushed meaningful commits today, **When** the agent processes them, **Then** the generated posts reference specific repos, describe what was built, and use appropriate tone for each platform.
3. **Given** I have no new public commits since the last run, **When** the schedule triggers, **Then** the agent sends a "no commits today" message to Slack.

---

### User Story 2 - Platform-Appropriate Post Style (Priority: P1)

As an AI Engineer, I want the X/Twitter post to be casual and concise (under 280 characters) and the LinkedIn post to be professional and detailed, so that the content fits each platform's audience and norms.

**Why this priority**: Platform mismatch would make the posts unusable regardless of how well they reflect the commits.

**Independent Test**: Can be tested by reviewing the generated posts in Slack — X post must be under 280 chars with conversational tone; LinkedIn post must be longer-form with problem/solution framing.

**Acceptance Scenarios**:

1. **Given** the agent generates an X/Twitter post, **When** the post is written, **Then** it is under 280 characters, uses first-person conversational tone, includes at most 2 hashtags, and mentions the repo or tech stack.
2. **Given** the agent generates a LinkedIn post, **When** the post is written, **Then** it describes the problem solved and lessons learned, uses professional tone, includes 3-5 hashtags, and is suitable for a professional audience.

---

### User Story 3 - Slack Delivery for Review (Priority: P2)

As an AI Engineer, I want the generated posts delivered to my Slack channel, so that I can review them before sharing and copy-paste them to my preferred platforms.

**Why this priority**: Keeps the human in the loop — the user retains control over what gets published. This is the delivery mechanism for v1.

**Independent Test**: Can be tested by verifying that after a schedule run, the designated Slack channel receives a formatted message containing both post variants.

**Acceptance Scenarios**:

1. **Given** posts have been generated, **When** the agent delivers them to Slack, **Then** the message includes a clear header, the X post section, the LinkedIn post section, and a note about which repos were referenced.
2. **Given** the Slack channel ID is configured, **When** the agent sends a message, **Then** it arrives in the correct channel and is readable without formatting issues.

---

### User Story 4 - Commit Quality Filtering (Priority: P2)

As an AI Engineer, I want the agent to skip trivial commits (typos, dependency bumps, merge commits) and focus on meaningful work, so that the generated posts are worth sharing.

**Why this priority**: Without filtering, posts would be about "fixed typo in README" which adds no value to my professional brand.

**Independent Test**: Can be tested by including a mix of trivial and meaningful commits in the feed and verifying the generated posts only reference meaningful ones.

**Acceptance Scenarios**:

1. **Given** the agent fetches commits, **When** it processes the list, **Then** commits matching patterns like "merge", "bump", "fix typo", "update dependency" are excluded from post generation.
2. **Given** only trivial commits exist since the last run, **When** the agent evaluates them, **Then** it reports "no meaningful commits today" instead of generating a low-value post.

---

### Edge Cases

- What happens when the GitHub API is rate-limited? → The agent should report the failure to Slack rather than silently dropping the run.
- What happens when a commit message is cryptic (e.g., "fix stuff")? → The agent should interpret it from context (repo name, file changes if available) or skip it.
- What happens when there are more than 15 meaningful commits? → The agent should pick the most impactful ones (by repo diversity, message specificity) and cap at 10-15 to stay within token limits.
- What happens when Slack delivery fails? → The agent should report the failure clearly so the user knows the run completed but delivery didn't.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST fetch the user's recent public GitHub commits via the GitHub Events API on a daily schedule.
- **FR-002**: System MUST filter out trivial commits (merge commits, dependency bumps, typo fixes, README-only changes) before generating posts.
- **FR-003**: System MUST generate one X/Twitter post per run that is under 280 characters, uses casual first-person tone, and includes 1-2 hashtags.
- **FR-004**: System MUST generate one LinkedIn post per run that describes the work in professional tone, includes problem/solution framing, and has 3-5 hashtags.
- **FR-005**: System MUST deliver both posts to a designated Slack channel in a formatted, readable message.
- **FR-006**: System MUST handle the "no commits" case gracefully by sending an informative message to Slack instead of generating empty posts.
- **FR-007**: System MUST run on a configurable schedule (default: 6 PM UTC daily) using Eve's scheduling mechanism.
- **FR-008**: System MUST use the Eve framework's native artifacts (tools, schedules, channels, skills) — no standalone scripts.

### Key Entities

- **Commit**: A single code commit with attributes: SHA (short), message, repo name, date, and URL. The raw input to post generation.
- **Post**: A social media post with attributes: platform (X or LinkedIn), content (the post text), hashtags (array), and repos referenced. The output of the generation step.
- **Slack Message**: The delivery container with attributes: target channel, formatted post content, and metadata about which repos/commits were used.

## Assumptions

- The user has a GitHub account with public repos and commits.
- The user has a Slack workspace where they can receive messages.
- GitHub REST API with a personal access token provides sufficient access (5000 req/hour authenticated).
- Posts are for v1 delivered to Slack only — direct posting to X/LinkedIn is out of scope.
- The user's commit messages are in English.
- "Meaningful" commits are those that add, fix, or improve functionality — not cosmetic or administrative changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On any day with at least one meaningful public commit, the system generates two posts (X + LinkedIn) and delivers them to Slack within 5 minutes of schedule trigger.
- **SC-002**: Generated posts reference specific repos and describe what was built — verified by checking that at least 80% of posts mention a repo name or technology.
- **SC-003**: X/Twitter posts are always under 280 characters — zero violations across 10 consecutive runs.
- **SC-004**: Trivial commits (typos, bumps, merges) are excluded — verified by checking that no generated post contains phrases like "fixed typo", "bumped version", or "merged branch".
- **SC-005**: On days with no meaningful commits, the system sends a "no commits" message to Slack instead of generating empty or irrelevant posts.
