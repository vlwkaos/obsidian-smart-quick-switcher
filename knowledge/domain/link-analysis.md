# Link Analysis

**Purpose**: Process of categorizing files by their link relationships to the current file
**Read when**: Understanding how link-based groups are determined
**Skip when**: Not working with link relationship detection

---

## What is Link Analysis?

Link analysis is the process of examining wikilinks between files to determine their relationship to the currently active file. This determines which files go into OUTGOING, BACKLINK, and TWO_HOP groups.

## Relationship Types

### Outgoing Links
Files that the current file links TO.

Example:
```markdown
Current file: Project A.md
Contains: [[Meeting Notes]] and [[Action Items]]
Result: Meeting Notes, Action Items → OUTGOING group
```

Detection: Parse current file's content for `[[wikilink]]` syntax.

### Backlinks
Files that link TO the current file.

Example:
```markdown
Current file: Project A.md
Daily Log.md contains: [[Project A]]
Weekly Review.md contains: [[Project A]]
Result: Daily Log, Weekly Review → BACKLINK group
```

Detection: Use Obsidian's MetadataCache to find files that reference current file.

### Two-Hop Links
Files that are exactly 2 links away through an intermediate file, but NOT direct backlinks.

Example:
```markdown
Current file: Project A.md
Meeting Notes.md links to Project A (this is a backlink)
Resources.md links to Meeting Notes (but not to Project A)
Result: Resources → TWO_HOP group (not BACKLINK)
```

**Important**: Two-hop links are **disjoint** from backlinks. A file cannot be both.

Algorithm:
1. Get all backlinks to current file
2. For each backlink, get all files that link to IT
3. Exclude files that are direct backlinks to current file
4. Remaining files are two-hop links

## Data Source

Link analysis uses Obsidian's **MetadataCache**:
- Automatically updated when files change
- Parses wikilinks from all markdown files
- Maintains bidirectional link graph
- No manual cache management needed

## Performance

Link analysis is computed on-demand:
- Triggered when search modal opens or query changes
- Cached within a single search operation
- Fast due to MetadataCache optimization

## Edge Cases

### Broken Links
Links to non-existent files are still analyzed:
- `[[Non Existent]]` in current file → "Non Existent" in OUTGOING (if it later exists)
- Helps discover files you need to create

### Circular Links
If A links to B and B links to A:
- When viewing A: B is OUTGOING
- When viewing B: A is OUTGOING
- Relationship is context-dependent

### Self Links
Links to the current file itself are ignored:
- `[[Project A]]` in Project A.md has no effect

### Multiple Links
Same file linked multiple times is still one relationship:
- `[[Notes]]` appears 5 times → Still just one OUTGOING link

## Example Analysis

Current file: `Project A.md`

Vault link structure:
```
Daily Log → Project A
Project A → Meeting Notes
Project A → Action Items
Meeting Notes → Resources
Action Items → Resources
Weekly Review → Project A
Resources → Tools
```

Results:
- OUTGOING: Meeting Notes, Action Items (direct links from Project A)
- BACKLINK: Daily Log, Weekly Review (link to Project A)
- TWO_HOP: Resources (via Meeting Notes, via Action Items), Tools (via Resources via Meeting Notes)

Note: Resources appears via two paths, but only counted once in TWO_HOP.

## Related Concepts

- See @knowledge/domain/result-group.md for group types and display
- See @knowledge/domain/file+result-group.md for categorization logic
- See @knowledge/coding/link-analyzer.md for implementation details
