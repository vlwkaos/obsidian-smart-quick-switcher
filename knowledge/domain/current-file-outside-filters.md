# Current File Outside Filters

**Purpose**: Behavior when current file doesn't match the active search rule's filters
**Read when**: Understanding why related files are shown even when current file doesn't match filter
**Skip when**: Current file always matches your active rules

---

## What Does "Outside Filters" Mean?

A file is "outside filters" when it fails the active rule's filtering criteria:
1. **Excluded by path:** File is in an excluded folder (e.g., `templates/`, `archive/`)
2. **Fails property filter:** File's frontmatter doesn't match property filter criteria

**Example:**
```
Active rule filter: access: public
Current file: work/project.md (access: local)
→ Current file is OUTSIDE filters (doesn't match access: public)
```

## Empty Query Behavior

**When you open the modal with current file outside filters:**

### Visual Indicator
- Placeholder text changes to: **"Current file outside filter - showing related files..."**
- Normal: "Search files..."
- Helps user understand why result list might be shorter

### Results Shown
**By default (`filterRelatedFiles: false`):**
- Shows ALL related files (recent, outgoing, backlinks, two-hop)
- Ignores property filters for these related files
- Each file has its relationship label (`[recent]`, `[out]`, `[back]`, `[related]`)

**If strict mode (`filterRelatedFiles: true`):**
- Shows only related files that ALSO match property filter
- More restrictive - fewer results
- Still shows with relationship labels

## Non-Empty Query Behavior

**When you type a search query with current file outside filters:**

Results are ALL marked with `[all]` label:
```
Query: "git"
Current file: work/project.md (outside filter)

Results:
[all] git-basics.md
[all] git-commands.md
[all] git-workflow.md
```

**Why all `[all]`?**
- Since current file is outside the filter context, there's no "filtered" reference point
- Search happens across all candidate files (minus excluded paths)
- No link prioritization - just search everything

**Respects `extendSearchResult`:**
- If `extendSearchResult: true` → show results as `[all]`
- If `extendSearchResult: false` → show nothing (strict mode)

## The `filterRelatedFiles` Setting

**Purpose:** Control whether to apply property filters to related files when current file is outside filters (empty query only)

**Default:** `false` (show all related files regardless of filter)

**When `filterRelatedFiles: false`:**
```
Current file: work/project.md (access: local) - outside filter
Rule filter: access: public
Empty query

Related files shown:
[out] work/task.md (access: local)      ← shown even though doesn't match filter
[back] notes/reference.md (access: public)   ← shown
```

**When `filterRelatedFiles: true`:**
```
Same scenario as above

Related files shown:
[back] notes/reference.md (access: public)   ← shown (matches filter)

NOT shown:
work/task.md (access: local)    ← filtered out (doesn't match property filter)
```

## Use Cases

### Personal + Work Vault Split

```
Rule 1 (WORK): access: local
Rule 2 (PERSONAL): access != local

When in WORK file (access: local):
- WORK rule → file is inside filter → normal behavior
- PERSONAL rule → file is outside filter → shows related work files anyway
```

**Benefit:** Can navigate between related files even when using "wrong" workspace rule

### Template Navigation

```
Current file: templates/daily-template.md
Rule: excludedPaths: ["templates/"]
Empty query

Behavior:
- File is outside filters (in excluded path)
- Shows related files that USE this template
- Helps navigate away from template to actual notes
```

## Mental Model

**Philosophy:** Relationships matter more than filters when you're "outside the box"

When current file doesn't fit the rule's criteria, the plugin assumes:
1. You still want to navigate efficiently
2. Related files are more useful than strictly filtered results
3. Visual indicator helps you understand the context

**It's not a bug, it's a feature** - prevents you from getting "stuck" in a file with no navigation options.

## Related Concepts

- See @knowledge/domain/search-rule.md for how rules define filters
- See @knowledge/domain/property-filters.md for frontmatter-based filtering
- See @knowledge/domain/excluded-paths.md for path-based filtering
- See @knowledge/domain/extended-search-results.md for `[all]` label behavior
