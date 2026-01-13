# Search Flow

**Purpose**: Complete workflow from user input to displayed results
**Read when**: Understanding the entire search process
**Skip when**: Working on isolated components

---

## Overview

The search flow has two main paths based on whether the user has typed a query.

## Empty Query Flow

When the search modal is opened with no text:

### 1. Apply Property Filters
- Get all markdown files in vault
- Filter by property criteria (if any configured)
- Result: Filtered file set

### 2. Add Recent Files (Optional)
If `recentFiles.ignoreFilters` is enabled:
- Get recent files from LRU cache
- Add any that aren't already in filtered set
- This allows quick access to recently used files even if they don't match filters

### 3. Categorize Files
For each file in the set:
- Determine ResultGroup based on relationship to current file
- Assign priority based on rule configuration
- Build SearchResult objects with (file, group, priority)

### 4. Sort and Display
- Sort by priority (lower = first)
- Within same priority, sort alphabetically
- Display in modal with group labels

## Non-Empty Query Flow

When user types search text:

### 1. Apply Property Filters
- Get all markdown files in vault
- Filter by property criteria
- Result: Filtered file set

### 2. Search Within Filtered Files
For each filtered file:
- Fuzzy search against filename (always)
- Fuzzy search in tags (if `searchInTags` enabled)
- Fuzzy search in properties (if `searchInProperties` enabled)
- Calculate score (filename: 100%, tags: 50%, properties: 30%)
- Keep files with score > 0

### 3. Check for Matches
Did we find any matches?

#### If No Matches:
- **Fallback enabled?**
  - Yes → Search ALL files (ignore filters), return as OTHER group
  - No → Return empty results

#### If Has Matches:
- Continue to next step

### 4. Categorize Matched Files
For each matched file:
- Determine ResultGroup based on relationship to current file
- Assign priority based on rule configuration
- Keep match score for sorting

### 5. Sort by Priority and Score
- First: Sort by group priority (lower number = higher priority)
- Then: Within each group, sort by match score (higher score = better match)

### 6. Add Non-Filtered Results (Optional)
If `showNonFiltered` is enabled AND we have matched files:
- Get all files NOT in filtered set
- Search these for query matches
- Assign to NON_FILTERED group (priority 1000)
- Sort by score within group
- Append to end of results

### 7. Apply Limit and Display
- Limit to `maxSuggestions` (default: 50)
- Display with group labels
- Non-filtered results shown dimmed with `[all]` label

## Example Flow Trace

User types "git" with these settings:
- Property filter: `access: local`
- showNonFiltered: true
- maxSuggestions: 50

```
1. Get all files → 1000 files
2. Apply filter → 300 files (access: local)
3. Search "git" in filtered files → 15 matches
   - git-commands.md (score: 95, recent)
   - git-workflow.md (score: 90, recent)
   - git-basics.md (score: 88, other)
4. Categorize and assign priorities
5. Sort by priority then score
6. Search non-filtered files for "git" → 8 matches
   - git-public.md (score: 92, access: public)
   - git-intro.md (score: 85, access: public)
7. Combine: 15 filtered + 8 non-filtered = 23 total
8. Display first 50 (we have 23)
```

Result display:
```
[recent] git-commands.md      notes-local/
[recent] git-workflow.md      notes-local/
         git-basics.md         notes-local/
[all]    git-public.md         notes/           ← dimmed
[all]    git-intro.md          notes/           ← dimmed
```

## State Transitions

The flow maintains these key states:
- **filteredFiles** - Files passing property filters
- **matchedFiles** - Filtered files matching query
- **sortedResults** - Matched files categorized and sorted
- **finalResults** - With non-filtered results appended (if enabled)

## Related Concepts

- See @knowledge/domain/property-filter.md for filtering step
- See @knowledge/domain/result-group.md for categorization step
- See @knowledge/domain/non-filtered-results.md for augmentation step
- See @knowledge/coding/search-engine.md for implementation
