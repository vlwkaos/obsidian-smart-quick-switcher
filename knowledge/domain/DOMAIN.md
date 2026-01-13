# Domain Knowledge

Project domain knowledge index. Each category links to detail files.
Use @knowledge/domain/filename.md syntax for references.

## Entities

- **SearchRule** - @knowledge/domain/search-rule.md - Configuration defining how search behaves (filters, priorities, fallback)
- **ResultGroup** - @knowledge/domain/result-group.md - Categories for organizing search results by relationship type
- **PropertyFilter** - @knowledge/domain/property-filter.md - Criteria for filtering files by frontmatter metadata

## Relationships

- **SearchRule+ResultGroup** - @knowledge/domain/search-rule+result-group.md - How rules configure priority ordering for different result groups
- **File+ResultGroup** - @knowledge/domain/file+result-group.md - How files are categorized based on relationship to current file

## Workflows

- **Search Flow** - @knowledge/domain/search-flow.md - Complete search process from empty/non-empty query to result display

## Terminology

- **Non-filtered results** - @knowledge/domain/non-filtered-results.md - Files outside property filters that still match the search query
- **Property filters** - @knowledge/domain/property-filters.md - Frontmatter metadata-based file filtering system
- **Link analysis** - @knowledge/domain/link-analysis.md - Process of categorizing files by link relationships
