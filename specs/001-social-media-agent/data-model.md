# Data Model: Social Media Agent

**Branch**: `001-social-media-agent` | **Date**: 2026-06-21

## Entities

### Commit

A single code commit from GitHub. The raw input to post generation.

| Attribute | Type | Description |
|-----------|------|-------------|
| sha | string | Short commit hash (7 chars) |
| message | string | Commit message (first line) |
| repo | string | Repository full name (e.g., "user/repo") |
| date | string | ISO 8601 timestamp of the push event |
| url | string | Direct link to the commit on GitHub |

**Source**: GitHub Events API → `PushEvent[].payload.commits[]`

**Filtering rules** (applied before post generation):
- Exclude if message matches: `/^merge/i`, `/^bump/i`, `/^fix typo/i`, `/^update dependency/i`, `/^readme/i`
- Cap at 15 commits per run
- If all commits are filtered out → "no meaningful commits" path

### Post

A generated social media post. The output of the LLM generation step.

| Attribute | Type | Description |
|-----------|------|-------------|
| platform | enum | "twitter" or "linkedin" |
| content | string | The post text (without hashtags) |
| hashtags | string[] | Array of hashtags (without #) |
| repos | string[] | Repos referenced in the post |

**Constraints by platform**:
- Twitter: content ≤ 280 chars, ≤ 2 hashtags, casual first-person tone
- LinkedIn: content ≤ 3000 chars, 3-5 hashtags, professional tone

### Slack Message

The delivery container sent to Slack.

| Attribute | Type | Description |
|-----------|------|-------------|
| channelId | string | Target Slack channel ID |
| header | string | Message header ("Daily Social Media Posts") |
| twitterPost | Post | The X/Twitter post section |
| linkedinPost | Post | The LinkedIn post section |
| reposReferenced | string[] | Unique repo names mentioned |
| generatedAt | string | ISO 8601 timestamp of generation |

## Relationships

```
Commit (15 max) ──generates──► Post (twitter)
                      │            Post (linkedin)
                      │
                      ▼
                 Slack Message (1 per run)
                      │
                      ▼
                 Slack Channel (configured)
```

## State Flow

```
[Schedule triggers at 6 PM UTC]
        │
        ▼
[Fetch GitHub Events API]
        │
        ▼
[Filter to PushEvents → Commits]
        │
        ▼
[Apply trivial-commit filter]
        │
        ├──→ [0 meaningful commits] ──→ Send "no commits" to Slack
        │
        └──→ [1-15 meaningful commits] ──→ Build LLM prompt
                                               │
                                               ▼
                                         [LLM generates posts]
                                               │
                                               ▼
                                         [Format Slack message]
                                               │
                                               ▼
                                         [Deliver to Slack]
```
