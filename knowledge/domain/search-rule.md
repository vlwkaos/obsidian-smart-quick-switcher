# SearchRule

**Purpose**: Configuration that defines how search should behave for a specific workspace or context
**Read when**: Understanding how search behavior is customized per workspace
**Skip when**: Just implementing basic search without configuration

---

## What is a SearchRule?

A SearchRule is a named configuration that controls every aspect of how the smart quick switcher searches and displays files. Each workspace can have different rules applied.

## Key Components

### Property Filters
List of criteria that files must match based on their frontmatter metadata. For example:
- Only show files where `status: published`
- Exclude files where `access: local`
- Only show files with `tags` that contain "work"

### Search Behavior
Controls which parts of files to search:
- File name (always searched)
- Tags in frontmatter
- Properties in frontmatter
- Content body

### Result Group Priorities
Defines the order in which different categories of results appear:
- Recent files (recently opened)
- Outgoing links (files current file links to)
- Backlinks (files that link to current file)
- Two-hop links (files connected through intermediate file)
- Other files (everything else)

Each group has:
- **Enabled/disabled** - Whether to show this category
- **Priority number** - Lower number = appears first (1 is highest)
- **Ignore filters** (recent only) - Show recent files even if they don't match property filters

### Non-filtered Results
- **showNonFiltered** - Whether to show matching files outside property filters
- These appear at the bottom with dimmed styling and `[all]` label

### Fallback Behavior
- **fallbackToAll** - When no results match, search all files without filters

## Example Mental Model

Think of SearchRule as a "search profile":
- Your "Work" workspace might filter to `access: local` files only, prioritize recent files
- Your "Personal" workspace might show all files, prioritize backlinks
- Your "Research" workspace might filter by `tags: research`, prioritize two-hop links

## Related Concepts

- See @knowledge/domain/result-group.md for details on result categories
- See @knowledge/domain/property-filter.md for filtering criteria
- See @knowledge/domain/search-rule+result-group.md for priority configuration
