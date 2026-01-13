# Property Filters (System)

**Purpose**: Overview of the frontmatter metadata-based file filtering system
**Read when**: Understanding the overall filtering concept
**Skip when**: Need specific operator details (see property-filter.md instead)

---

## What is Property Filtering?

Property filtering is the system that lets users restrict which files appear in search results based on frontmatter metadata values.

## How It Works

### Frontmatter Check
Before any search happens, each file's frontmatter is checked against all configured property filters.

Example file:
```markdown
---
status: published
access: local
tags: [work, important]
author: John
---

# File content here
```

Example filters:
- `access equals "local"` → PASS
- `status equals "published"` → PASS
- `tags contains "work"` → PASS

All must pass for file to be included.

### Filter Application Points

Property filters are applied at two stages:

**1. Empty Query (Initial View)**
- Filter all vault files
- Optionally add recent files (can bypass filters)
- Show grouped results

**2. Search Query**
- Filter all vault files first
- Then search within filtered set
- Optionally show non-filtered matches at bottom

## Configuration

Filters are configured per SearchRule:
- Each rule can have 0+ property filters
- Multiple filters = AND logic (all must pass)
- Applied consistently across all search operations

## Purpose and Benefits

### Focus
Narrow search scope to relevant files:
- Work workspace: Only `access: local` files
- Writing workspace: Only `status: draft` or `status: review` files
- Archive workspace: Exclude `archived: true` files

### Performance
Fewer files to search = faster results

### Context Switching
Different filters for different workspaces = automatic context adjustment

## Bypass Mechanisms

Two ways to see files outside filters:

### 1. Recent Files Bypass (Empty Query Only)
When `recentFiles.ignoreFilters` is enabled:
- Recent files shown even if they don't match filters
- Only in empty query view
- Labeled `[recent]`

### 2. Non-filtered Results (Search Query Only)
When `showNonFiltered` is enabled:
- Files matching query but failing filters shown at bottom
- Only when searching (non-empty query)
- Labeled `[all]` and dimmed

## Example Use Case

Setup:
```
Property filters:
- access equals "local"
- status not-equals "archived"

Recent files bypass: enabled
Show non-filtered: enabled
```

Behavior:
- **Empty query**: Shows local+active files, plus recent files (even if not local/active)
- **Search "meeting"**: Shows local+active files matching "meeting", plus non-local/archived files matching "meeting" (dimmed at bottom)

## Related Concepts

- See @knowledge/domain/property-filter.md for individual filter details and operators
- See @knowledge/domain/non-filtered-results.md for bypass mechanism
- See @knowledge/domain/search-rule.md for configuration context
