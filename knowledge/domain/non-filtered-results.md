# Non-filtered Results

**Purpose**: Files outside property filters that still match the search query
**Read when**: Understanding the "show all matching files" feature
**Skip when**: Not working with the showNonFiltered feature

---

## What Are Non-filtered Results?

Non-filtered results are files that:
1. Match the user's search query (contain the search text)
2. Do NOT pass the property filters
3. Are shown anyway to provide complete search coverage

Think of it as: "Here are ALL files matching your query, not just the filtered ones."

## When They Appear

Non-filtered results only appear when:
- `showNonFiltered` is enabled in the search rule (default: true)
- Query is not empty (user typed something)
- There ARE filtered results (at least 1 match in filtered set)

They do NOT appear when:
- `showNonFiltered` is disabled
- Query is empty (no search text)
- No filtered results found (fallback takes over instead)

## Visual Presentation

Non-filtered results are visually distinct:
- Appear at the bottom (after all filtered results)
- Label: `[all]` in faint color
- Dimmed: 60% opacity
- Smaller: 95% font size
- Directory path: 50% opacity

Example:
```
git-commands.md       [recent]   notes-local/     ← normal
git-workflow.md                  notes-local/     ← normal
git-public.md         [all]      notes/           ← dimmed
git-intro.md          [all]      notes/           ← dimmed
```

## Sorting Within Group

Non-filtered results have:
- Group: NON_FILTERED
- Priority: 1000 (lowest, always at bottom)
- Sorted by match score (descending) within their group

## Use Cases

### Cross-Filter Discovery
Property filter: `access: local` (work files only)
Query: "git"
Result: See work git files first, but also discover personal git files at bottom

### Complete Coverage
Ensures users never miss relevant files due to overly restrictive filters.

### Context Awareness
Filtered results are "primary" (normal styling), non-filtered are "secondary" (dimmed), providing clear visual hierarchy.

## Configuration

Users can toggle this feature per rule:
- Enable: "Show matching files outside the filter alongside filtered results (dimmed, labeled [all])"
- Disable: Only show filtered results

## Comparison with Fallback

### Non-filtered Results
- Triggered: When filtered results exist
- Shows: Filtered results + non-filtered results
- Purpose: Augment filtered results with additional matches

### Fallback
- Triggered: When NO filtered results exist
- Shows: All files matching query (no filters applied)
- Purpose: Prevent empty result set

They are mutually exclusive behaviors.

## Example Scenario

Setup:
- Property filter: `status: published`
- Query: "react"
- Files:
  - react-hooks.md (published) → Filtered match
  - react-intro.md (draft) → Non-filtered match
  - react-testing.md (published) → Filtered match
  - vue-intro.md (published) → No match

Result with `showNonFiltered: true`:
```
react-hooks.md              ← filtered, normal
react-testing.md            ← filtered, normal
react-intro.md     [all]    ← non-filtered, dimmed
```

Result with `showNonFiltered: false`:
```
react-hooks.md              ← filtered only
react-testing.md            ← filtered only
```

## Related Concepts

- See @knowledge/domain/property-filter.md for what "filtered" means
- See @knowledge/domain/result-group.md for NON_FILTERED group details
- See @knowledge/domain/search-flow.md for when non-filtered results are added
