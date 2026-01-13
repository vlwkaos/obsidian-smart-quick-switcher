# PropertyFilter

**Purpose**: Criteria for filtering files based on frontmatter metadata values
**Read when**: Understanding how files are filtered before search
**Skip when**: Not working with property-based filtering

---

## What is a PropertyFilter?

A PropertyFilter is a rule that checks if a file's frontmatter metadata matches specific criteria. Only files that pass all property filters are included in search results (unless `showNonFiltered` is enabled).

## Structure

Each filter has three parts:
- **propertyKey** - The frontmatter field to check (e.g., `status`, `tags`, `access`)
- **operator** - How to compare the value
- **value** - The value to compare against (empty for exists/not-exists)

## Operators

### equals
Property value must exactly match the filter value.
- `status equals "published"` - Only files with `status: published`

### not-equals
Property must exist with a different value.
- `status not-equals "draft"` - Files with status other than draft
- **Important**: Files without the property do NOT match (semantic meaning of "not equal")

### contains
Property value must contain the filter value (case-sensitive substring match).
- `tags contains "work"` - Files where tags include "work" (e.g., `tags: [work, important]`)

### exists
Property must be present in frontmatter, any value accepted.
- `author exists ""` - Only files that have an `author` field

### not-exists
Property must not be present in frontmatter.
- `draft not-exists ""` - Only files without a `draft` field

## Multi-value Properties

For array properties (like tags), the operator checks against each value:
- `tags contains "urgent"` matches if ANY tag contains "urgent"
- `tags equals "urgent"` matches if ANY tag exactly equals "urgent"

## Filter Combination

Multiple filters are combined with AND logic:
- Filter 1: `access equals "local"`
- Filter 2: `status equals "active"`
- Result: Only files that are BOTH local access AND active status

## Example Use Cases

### Work Files Only
```
access equals "local"
```

### Published Content
```
status equals "published"
draft not-exists ""
```

### Tagged Work Items
```
tags contains "work"
status not-equals "done"
```

## Related Concepts

- See @knowledge/domain/search-rule.md for how filters are configured per rule
- See @knowledge/domain/non-filtered-results.md for files that don't pass filters
- See @knowledge/coding/property-filter-utils.md for implementation details
