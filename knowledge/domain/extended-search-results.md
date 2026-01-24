---
name: extended-search-results
description: Files matching query but outside property filters, shown with [all] label and dimmed
keywords: extended-results, all-label, non-filtered, extend-search-result, dimmed, safety-net
---

# Extended Search Results

## What Are Extended Search Results?

Extended search results are files that match the search query but are **outside** the rule's property filters. They appear with an `[all]` label and dimmed styling to indicate they're from the broader search space.

## The `extendSearchResult` Setting

**Replaces old settings:** `showNonFiltered` + `fallbackToAll` → merged into one setting

**When enabled (`true`):**
- Search BOTH filtered files AND non-filtered files
- Filtered results appear with their group labels (`[recent]`, `[out]`, `[back]`, etc.)
- Non-filtered results appear with `[all]` label (dimmed)
- All results are shown together

**When disabled (`false`):**
- Search ONLY filtered files
- No `[all]` results shown
- Stricter, focused results

**Default:** `true` (show extended results)

## Behavior by Scenario

### Scenario 1: Current File Inside Filters + Query

```
Current file: notes/project.md (access: public) - INSIDE filter
Rule filter: access: public
Query: "git"
extendSearchResult: true

Results shown:
[recent] git-basics.md          ← matches filter + query
[out]    git-workflow.md        ← matches filter + query
[all]    git-private.md         ← doesn't match filter, but matches query
```

### Scenario 2: Current File Outside Filters + Query

```
Current file: work/project.md (access: local) - OUTSIDE filter  
Rule filter: access: public
Query: "git"
extendSearchResult: true

Results shown:
[all] git-basics.md             ← all results marked [all]
[all] git-workflow.md
[all] git-private.md
```

**Note:** When current file is outside filters, ALL search results get `[all]` label (no link prioritization during search).

### Scenario 3: Empty Query

**Empty query does NOT use extendSearchResult** - it has its own logic:
- If current file inside filters → show filtered files with link groups
- If current file outside filters → show related files (controlled by `filterRelatedFiles`)

## Sorting Order

Results are sorted by:
1. **Group priority** (lower number = higher)
2. **Fuzzy match score** within each group

**Group priorities:**
- `[recent]`: 1 (configurable)
- `[out]`: 2 (configurable)
- `[back]`: 3 (configurable)
- `[related]`: 4 (configurable)
- `[other]`: 999 (hardcoded)
- **`[all]`: 1000 (hardcoded, always last)**

**Within `[all]` group:** Sorted by fuzzy match score (highest first)

## Visual Indicators

**Label:** `[all]` prefix on each result

**Styling:** Dimmed appearance (CSS class: `smart-quick-switcher-item-non-filtered`)

**Purpose:** Subtle visual cue that these are outside your filter but might be useful

## When NOT to Use Extended Results

**Disable `extendSearchResult` when:**
- You want strict filtering (only show files matching rules)
- Large vaults where extended search is too broad
- Specific workflows where out-of-filter results are distracting

**Enable `extendSearchResult` when:**
- You want discovery (find things outside current filter)
- You might have forgotten which filter you're using
- You want fallback behavior when filtered search yields few results

## Mental Model

Think of `extendSearchResult` as "safety net" search:
- Primary results: Files matching your rule (focused)
- Extended results: Everything else that matches query (discovery)

The `[all]` label means: "This file matches your search text, but not your active filter rule."

## Related Concepts

- See @knowledge/domain/search-rule.md for rule configuration
- See @knowledge/domain/property-filters.md for what determines "filtered" vs "non-filtered"
- See @knowledge/domain/current-file-outside-filters.md for empty query behavior
- See @knowledge/domain/excluded-paths.md for path-based filtering
