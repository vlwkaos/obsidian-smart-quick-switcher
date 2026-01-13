# SearchRule + ResultGroup

**Purpose**: How search rules configure priority ordering for different result groups
**Read when**: Understanding how result display order is controlled
**Skip when**: Not working with result prioritization

---

## Relationship

A SearchRule defines the **priority** and **enabled status** for each ResultGroup. This controls which groups appear and in what order.

## Priority System

### Priority Numbers
- Lower number = Higher priority = Appears first
- Range: 1 (highest) to 999+ (lowest)
- Default priorities:
  - Recent: 1
  - Outgoing: 2
  - Backlinks: 3
  - Two-hop: 4
  - Other: 999
  - Non-filtered: 1000

### Customization
Users can reorder priorities in settings using up/down arrows. For example:
- Research workflow: Backlinks first (priority 1), Recent second (priority 2)
- Writing workflow: Recent first (priority 1), Outgoing second (priority 2)

## Enabled/Disabled Groups

Each group can be toggled on/off:
- **Enabled**: Files in this group appear in results
- **Disabled**: Files in this group are hidden (treated as OTHER)

### Example Configuration

```
Rule: "Writing Mode"
  Recent files: enabled, priority 1
  Outgoing links: enabled, priority 2
  Backlinks: disabled
  Two-hop links: disabled
  
Result: Only recent and outgoing files shown, recent appears first
```

## Special Behaviors

### Recent Files - Ignore Filters
Recent files can optionally bypass property filters in empty query view:
- `ignoreFilters: true` - Show recent files even if they don't match filters
- Only applies to empty query (no search text)
- Helps maintain quick access to recently worked files

### Within-Group Sorting
Even after priority ordering, files within the same group are sorted by **match score**:
- Higher score = Better match = Appears first in group
- Score based on: filename match (100%), tags (50%), properties (30%)

## Example Flow

User searches "project" with this rule:
```
Property filter: status equals "active"
Recent: priority 1, enabled
Backlinks: priority 2, enabled
Other: priority 999, enabled
showNonFiltered: true
```

Results appear in order:
1. Recent active files matching "project" (sorted by score)
2. Active backlinks matching "project" (sorted by score)
3. Other active files matching "project" (sorted by score)
4. Non-active files matching "project" - dimmed `[all]` (sorted by score)

## Related Concepts

- See @knowledge/domain/search-rule.md for full rule configuration
- See @knowledge/domain/result-group.md for group types and meanings
- See @knowledge/coding/sorting-priority.md for implementation details
