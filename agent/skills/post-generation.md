---
name: post-generation
description: Guidance for writing engaging social media posts about code commits. Use when: generating posts, writing social media content, creating X/Twitter posts, creating LinkedIn posts, turning commits into posts, post writing, content creation from commits.
---

# Post Generation

This skill provides guidance for turning GitHub commits into engaging social media posts.

## Commit Classification

**High-value commits to feature:**
- New features or functionality
- Performance improvements
- Architecture changes
- Interesting bug fixes with clear problem/solution
- Open source contributions
- Learning/teaching moments

**Commits to skip (with regex patterns used by the schedule):**
- Typo fixes (`/^fix typo/i`)
- README updates (`/^readme/i`)
- Dependency version bumps (`/^bump/i`, `/^update dependency/i`)
- Merge commits (`/^merge/i`)
- WIP commits (`/^wip/i`, `/^tmp/i`, `/^temp/i`)
- Single-word vague messages (`/^test$/i`, `/^fix$/i`, `/^update$/i`)
- Configuration-only changes (no functional impact)

The schedule applies these patterns before sending commits to the LLM. The LLM applies additional judgment for edge cases.

## Writing Guidelines

### X/Twitter

- Start with what was built, not "I just committed..."
- Use present tense for impact
- Include a specific detail (tech stack, problem solved)
- End with a question or call to engage
- Max 280 characters
- Max 2 hashtags

**Good example:**
```
Just shipped a Redis caching layer for our API. Response times dropped
from 200ms to 15ms. The trick? Write-through with a 5-min TTL.
#WebDev #Performance
```

**Bad example:**
```
Made some updates to the API today. #coding #tech
```

### LinkedIn

- Lead with the problem, then the solution
- Explain the "why" behind technical decisions
- Share what was learned
- Invite discussion
- Professional but authentic
- 3-5 hashtags

**Good example:**
```
This week I tackled a performance bottleneck in our data pipeline.

The root cause: N+1 queries in our batch processing job that ran
every night and took 4+ hours.

Solution: Implemented a custom DataLoader pattern with Redis caching
for intermediate results. Result: 10x throughput improvement, now
completes in 20 minutes.

Key lesson: Always profile before optimizing. The bottleneck wasn't
where I initially expected.

What performance wins have you had recently?
#SoftwareEngineering #Performance #Backend
```

**Bad example:**
```
I worked on the data pipeline this week. It's faster now.
#engineering
```

## Tone Rules

- Be authentic, not hype-y
- Share the journey, not just the destination
- Admit what was hard
- Credit collaborators when relevant
- Never post anything that could reveal sensitive information
