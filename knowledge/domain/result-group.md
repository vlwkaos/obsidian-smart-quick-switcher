# ResultGroup

**Purpose**: Categories for organizing search results by their relationship to the current file
**Read when**: Understanding how search results are organized and prioritized
**Skip when**: Not working with search result display or ordering

---

## What is a ResultGroup?

A ResultGroup represents a category that a file can belong to based on its relationship to the currently active file. Files are automatically categorized into exactly one group.

## Available Groups

### RECENT
Files that were recently opened by the user. Tracked via LRU (Least Recently Used) cache with configurable size (default: 4 files).

### OUTGOING
Files that the current file directly links to. For example, if you're viewing "Project A" and it contains `[[Meeting Notes]]`, then "Meeting Notes" is in the OUTGOING group.

### BACKLINK
Files that link to the current file. For example, if "Daily Log" contains `[[Project A]]` and you're viewing "Project A", then "Daily Log" is in the BACKLINK group.

### TWO_HOP
Files that are exactly 2 links away from the current file through an intermediate file, but **not** directly linked. 

Example:
- Current file: "Project A"
- "Meeting Notes" links to "Project A" (this is a backlink)
- "Action Items" links to "Meeting Notes" (but not to "Project A")
- "Action Items" appears in TWO_HOP group

**Important**: Two-hop links are disjoint from backlinks - a file is either a backlink OR a two-hop link, never both.

### NON_FILTERED
Files that match the search query but don't pass the property filters. These appear at the bottom with dimmed styling and `[all]` label when `showNonFiltered` is enabled.

Example:
- Property filter: `access: local`
- Query: "git"
- File "git-public.md" has `access: public` but matches "git"
- It appears in NON_FILTERED group

### OTHER
Files that don't fit into any of the above categories. This is the default catch-all group.

## Visual Representation

Results appear with labels:
- `[recent]` - Recent files
- `[out]` - Outgoing links
- `[back]` - Backlinks
- `[related]` - Two-hop links
- `[all]` - Non-filtered results (dimmed)
- No label - Other files

## Sorting Within Groups

Within each group, files are sorted by **match score** (descending):
- Exact filename matches score highest
- Tag matches score 50% of filename
- Property matches score 30% of filename

## Related Concepts

- See @knowledge/domain/search-rule+result-group.md for how groups are prioritized
- See @knowledge/domain/link-analysis.md for how link relationships are determined
- See @knowledge/domain/non-filtered-results.md for NON_FILTERED group behavior
