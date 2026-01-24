---
name: file+result-group
description: Logic for categorizing files into groups based on relationship to current file
keywords: categorization, relationship-detection, recent, outgoing, backlinks, two-hop, priority-order
---

# File + ResultGroup

## Relationship

Each file in search results is assigned to exactly one ResultGroup based on its relationship to the currently active file.

## Categorization Logic

Files are checked in priority order (first match wins):

### 1. Check RECENT
Is the file in the LRU cache of recently opened files?
- Yes → RECENT group
- No → Continue checking

### 2. Check OUTGOING
Does the current file contain a wikilink to this file?
- Yes → OUTGOING group
- No → Continue checking

### 3. Check BACKLINK
Does this file contain a wikilink to the current file?
- Yes → BACKLINK group
- No → Continue checking

### 4. Check TWO_HOP
Is this file exactly 2 links away through an intermediate file?
- Path exists: Current → Intermediate → This file
- AND this file is not a direct backlink
- Yes → TWO_HOP group
- No → Continue checking

### 5. Default to OTHER
If none of the above match → OTHER group

### Special: NON_FILTERED
After initial categorization, if `showNonFiltered` is enabled:
- Files that match the query but failed property filters → NON_FILTERED group
- These are appended at the bottom with lowest priority

## Example Scenario

Current file: `Project A.md`

Files in vault:
- `Meeting Notes.md` - Last opened 2 hours ago → RECENT
- `Action Items.md` - Linked from Project A → OUTGOING  
- `Daily Log.md` - Links to Project A → BACKLINK
- `Resources.md` - Links to Action Items (which links to Project A) → TWO_HOP
- `git-intro.md` - Has `access: public`, filter requires `access: local` → NON_FILTERED (if query matches)
- `Random Note.md` - No relationship → OTHER

## Dynamic Behavior

### Relationship Changes
When files are edited and links change:
- Relationships are recalculated on next search
- Uses MetadataCache (updates automatically when files change)
- No manual refresh needed

### Current File Changes
When you switch to a different file:
- All relationships recalculate relative to new current file
- A file that was OUTGOING might become OTHER
- Recent files remain recent (independent of current file)

## Edge Cases

### No Current File
If no file is active (e.g., just opened Obsidian):
- All files go to OTHER group
- Only Recent files get their group (not relative to current file)

### Self-Reference
The current file itself is excluded from results - you can't navigate to the file you're already viewing.

## Related Concepts

- See @knowledge/domain/result-group.md for group types and visual display
- See @knowledge/domain/link-analysis.md for how link relationships are detected
- See @knowledge/coding/link-analyzer.md for implementation details
