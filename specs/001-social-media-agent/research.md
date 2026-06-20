# Research: Social Media Agent

**Branch**: `001-social-media-agent` | **Date**: 2026-06-21

## Technology Decisions

### GitHub API: Events API over Commits API

**Decision**: Use `GET /users/{username}/events/public` (Events API) to fetch recent activity.

**Rationale**: The Events API returns a chronological stream across all public repos. Filtering to `PushEvent` gives us actual code commits. The Commits API requires specifying a repo, meaning we'd need to first list all repos then fetch commits from each — more requests, more complexity.

**Alternatives considered**:
- Commits API per repo: Requires N+1 requests (list repos + fetch commits from each). Slower and more complex.
- GitHub MCP connection: Adds a dependency and setup step. The REST API is sufficient for v1 and simpler.
- `gh` CLI: Requires CLI installation in the runtime environment. Not available in Eve's sandbox by default.

### Post Generation: LLM in Schedule Handler

**Decision**: The schedule handler builds a prompt with commit data and sends it to the agent's LLM for generation.

**Rationale**: Eve's `receive()` API allows a schedule to start an agent session. The LLM (owl-alpha) handles the creative work of turning commits into engaging posts. This is the natural Eve pattern — the schedule orchestrates, the agent creates.

**Alternatives considered**:
- Template-based generation: Too rigid. Commit messages vary wildly; templates would produce generic posts.
- Separate generation service: Overkill for a single-user agent. Eve's built-in LLM is sufficient.

### Slack Delivery: Eve's `receive()` Pattern

**Decision**: Use `receive("slack", { message, target, auth })` from the schedule handler.

**Rationale**: This is Eve's native proactive messaging pattern. The schedule can start sessions on other channels. No need for direct Slack API calls or webhook configuration.

**Alternatives considered**:
- Direct Slack webhook: Would require a separate webhook URL and bypass Eve's channel system.
- Slack MCP connection: Overkill for simple message delivery; Vercel Connect handles auth natively.

### Commit Filtering: Pattern-Based + LLM Judgment

**Decision**: Apply regex-based filtering first (remove obvious trivial commits), then let the LLM apply judgment for edge cases.

**Rationale**: Regex catches the common cases (merges, bumps, typos) cheaply. The LLM can handle cryptic commit messages ("fix stuff", "WIP") that don't match patterns.

**Alternatives considered**:
- LLM-only filtering: More expensive (every commit goes through the LLM). Pattern pre-filtering reduces the load.
- Regex-only filtering: Too rigid. Would miss edge cases and produce low-quality posts.

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| Which GitHub API? | Events API (simplest, cross-repo) |
| How to generate posts? | LLM via Eve's receive() pattern |
| How to deliver to Slack? | Eve's native receive("slack", ...) |
| How to filter commits? | Regex pre-filter + LLM judgment |
| What model? | owl-alpha via OpenRouter (constitution) |
| What schedule? | 6 PM UTC daily (user choice) |
