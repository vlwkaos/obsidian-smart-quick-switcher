---
name: excluded-paths
description: Path-based filtering to completely remove folders from search (templates, archive)
keywords: excluded-paths, folder-filtering, path-matching, search-scope, templates, archive
---

# Excluded Paths

## What Are Excluded Paths?

Excluded paths are folder paths that are completely removed from search consideration **before** any other filtering happens. Files in excluded folders will never appear in search results, regardless of other settings.

## How They Work

### Filter Order
1. **Excluded paths filter** ← Applied FIRST
2. Property filters ← Applied to remaining files
3. Search query matching
4. Link analysis and grouping

### Matching Rules

**Exact folder matching:**
- `templates/` excludes all files in the `templates/` folder
- `archive/old/` excludes all files in `archive/old/` folder
- Nested files are also excluded (e.g., `templates/sub/file.md` is excluded by `templates/`)

**What it does NOT match:**
- `temp/` does NOT exclude `templates/` (exact folder match required)
- Partial folder names don't match

## Example

```
Excluded paths: ["templates/", "archive/old/"]

File locations:
- templates/daily.md          → EXCLUDED
- templates/weekly.md         → EXCLUDED
- archive/old/2020.md         → EXCLUDED
- archive/new/2024.md         → NOT excluded (archive/old/ doesn't match archive/new/)
- notes/template.md           → NOT excluded (notes/ not in list)
```

## Use Cases

**Common scenarios:**
- Exclude template folders that aren't real notes
- Exclude archive folders with old content
- Exclude draft folders during active search
- Workspace-specific: exclude `work/` folder in personal workspace

## Configuration

### Per-Rule Setting

Each SearchRule has its own `excludedPaths` array:

```typescript
{
  excludedPaths: ["templates/", "archive/"],
  propertyFilters: [...],
  // ... other settings
}
```

### User Interface

- Folder autocomplete when adding paths
- Suggests existing vault folders as you type
- Shows list of currently excluded paths
- Remove button for each excluded path

## Relationship to Other Filters

**Applies to ALL search scenarios:**
- Empty query (showing related files)
- Non-empty query (searching with text)
- Filtered results
- Extended results (`[all]` label)

**Always respected:**
- Even if `filterRelatedFiles: false` (related files still can't come from excluded paths)
- Even if `extendSearchResult: true` (extended search doesn't include excluded paths)

## Mental Model

Think of excluded paths as "invisible folders" - they're removed from the vault's search space entirely for that rule.

## Related Concepts

- See @knowledge/domain/property-filters.md for metadata-based filtering
- See @knowledge/domain/search-rule.md for how rules are configured
- See @knowledge/domain/extended-search-results.md for `[all]` label behavior
