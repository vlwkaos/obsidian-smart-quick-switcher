# Sorting Priority

**Purpose**: Standard for how search results are ordered
**Read when**: Implementing or modifying result sorting
**Skip when**: Not working with result ordering

---

## Sorting Rule

Search results are sorted with **two levels of priority**:

1. **Group Priority** (primary sort)
2. **Match Score** (secondary sort within group)

## Group Priority

**Lower number = Higher priority = Appears first**

Default priorities:
- Recent files: 1
- Outgoing links: 2
- Backlinks: 3
- Two-hop links: 4
- Other files: 999
- Non-filtered: 1000

### Customizable
Users can reorder priorities in settings using up/down arrows:
```typescript
// Example: Prioritize backlinks over recent
rule.backlinks.priority = 1;
rule.recentFiles.priority = 2;
```

### Implementation
```typescript
// First sort: by priority (ascending)
if (a.priority !== b.priority) {
  return a.priority - b.priority;
}
```

## Match Score

**Higher score = Better match = Appears first (within same group)**

Score calculation:
- **Filename match:** 100% weight
- **Tag match:** 50% weight  
- **Property match:** 30% weight

### Example
Query: "git"

Files with same priority (all in OTHER group):
- `git-commands.md` - filename match (score: 95)
- `development.md` with tag `#git-workflow` - tag match (score: 47.5)
- `notes.md` with property `tool: git` - property match (score: 28.5)

Order: git-commands.md → development.md → notes.md

### Implementation
```typescript
// Second sort: by score (descending) within same priority
return b.score - a.score;
```

## Complete Sorting Algorithm

```typescript
function sortResults(results: SearchResult[]): SearchResult[] {
  return results.sort((a, b) => {
    // Primary: Group priority (lower = higher priority)
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    
    // Secondary: Match score (higher = better match)
    return b.score - a.score;
  });
}
```

## Example Result Order

Query: "react"

Setup:
- Recent priority: 1
- Outgoing priority: 2
- Other priority: 999
- Non-filtered priority: 1000

Results:
```
[recent]  react-hooks.md          (priority 1, score 95)
[recent]  react-patterns.md       (priority 1, score 85)
[out]     react-intro.md          (priority 2, score 90)
[out]     react-components.md     (priority 2, score 80)
          react-testing.md        (priority 999, score 88)
          react-router.md         (priority 999, score 75)
[all]     react-external.md       (priority 1000, score 92)
[all]     react-archived.md       (priority 1000, score 70)
```

**Within each group:**
- Recent: hooks (95) before patterns (85)
- Outgoing: intro (90) before components (80)
- Other: testing (88) before router (75)
- Non-filtered: external (92) before archived (70)

## Alphabetical Fallback

When priority AND score are equal:
```typescript
if (a.priority === b.priority && a.score === b.score) {
  return a.file.basename.localeCompare(b.file.basename);
}
```

This is rare but ensures deterministic ordering.

## Empty Query Sorting

When query is empty (no scores):
- Sort by priority only
- Within same priority, sort alphabetically

```typescript
if (a.priority !== b.priority) {
  return a.priority - b.priority;
}
return a.file.basename.localeCompare(b.file.basename);
```

## Why This Ordering?

### Group First
Users configure groups based on **context** (recent, related, etc.). This is more important than fuzzy match quality.

Example: In "recent" mode, you want recent files even if they're not perfect matches.

### Score Second
Within a context (group), better matches should appear first. If two files are both "recent", show the one that better matches the query.

### User Control
Users can completely reorder groups via settings, but score ordering is fixed (always best match first within group).

## Related Concepts

- See @knowledge/domain/result-group.md for group types
- See @knowledge/domain/search-rule+result-group.md for priority configuration
- See @knowledge/coding/suggestion-utils.md for implementation
