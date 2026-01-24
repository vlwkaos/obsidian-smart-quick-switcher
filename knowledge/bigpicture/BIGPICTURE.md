# Big Picture

Bird's eye view of how Smart Quick Switcher components interconnect.

## Core Value Proposition

**Problem**: Obsidian's default Quick Switcher treats all files equally. In a large vault with mixed content (work, personal, technical), users waste time scrolling through irrelevant files.

**Solution**: Workspace-aware file switching with intelligent prioritization based on:
1. Link relationships (contextual relevance)
2. Property filters (semantic boundaries)
3. Recency (working memory)

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Input                               │
│            (Modal Open → Empty Query / Typed Query)              │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SmartQuickSwitcherModal                       │
│                  (Extends FuzzySuggestModal)                     │
│  • Delegates to SearchEngine for results                         │
│  • Renders with group labels ([recent], [out], [back], [all])   │
│  • Handles file selection → Opens file                           │
└─────────────────────────────┬───────────────────────────────────┘
                              │ search(query, rule, currentFile)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SearchEngine                               │
│               (Orchestration Service)                            │
│                                                                  │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────┐       │
│  │ LinkAnalyzer │  │PropertyFilter  │  │RecentFiles     │       │
│  │              │  │Engine          │  │Tracker         │       │
│  │ • Backlinks  │  │                │  │                │       │
│  │ • Outgoing   │  │ • equals       │  │ • LRU cache    │       │
│  │ • Two-hop    │  │ • contains     │  │ • Per-file     │       │
│  └──────┬───────┘  │ • exists       │  │   tracking     │       │
│         │          │ • not-exists   │  └────────┬───────┘       │
│         │          │ • not-equals   │           │               │
│         │          └────────┬───────┘           │               │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│    ┌────────────────────────────────────────────────────┐       │
│    │            Pure Utility Functions (src/utils/)      │       │
│    │                                                     │       │
│    │  linkAnalysisUtils    propertyFilterUtils           │       │
│    │  searchUtils          lruCacheUtils                 │       │
│    │                                                     │       │
│    │  ✅ 105 tests         ✅ No Obsidian deps           │       │
│    └────────────────────────────────────────────────────┘       │
│                              │                                   │
│                              ▼                                   │
│                     SearchResult[]                               │
│                  (file, group, priority)                         │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Settings Tab                               │
│                                                                  │
│  • SearchRule management (CRUD)                                  │
│  • Workspace → Rule mapping                                      │
│  • Priority configuration per group                              │
│  • Property filter builder                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Empty Query

```
Modal opens
    │
    ▼
Is current file outside filters? ────── No ────► Apply property filters
    │                                               │
    │ Yes                                           ▼
    ▼                                          Get filtered files
Get related files (links + recent)                  │
    │                                               ▼
    │ ◄────────────────────────────────────── Optionally add recent
    │                                          files (ignoreFilters)
    ▼
Categorize by relationship
    │
    ▼
Sort by priority → Render
```

## Data Flow: Typed Query

```
User types query
    │
    ▼
Is current file outside filters? ────── No ────► Apply property filters
    │                                               │
    │ Yes                                           ▼
    ▼                                          Search in filtered files
Search in linked files FIRST                        │
    │                                               ▼
    │ ◄────────────────────────────────────── Categorize + sort
    │                                               │
    ▼                                               ▼
extendSearchResult? ──── No ────────────────────────┼
    │                                               │
    │ Yes                                           │
    ▼                                               │
Search ALL files for additional matches             │
Mark with [all] label (NON_FILTERED group)          │
    │                                               │
    ▼                                               ▼
Combine: prioritized + filtered + [all] ───────► Render
```

## Key Integration Points

### 1. SearchEngine ↔ Services
- SearchEngine orchestrates, never owns business logic
- Services extract data from Obsidian API, then call pure functions
- Pure functions are the **only** place where filtering/sorting logic lives

### 2. SearchRule ↔ All Components
A single rule change can affect:
- Which files are shown (property filters)
- What order they appear (priority settings)
- Whether extended results show ([all] toggle)
- How related files are treated (filterRelatedFiles)

**Lever Effect**: Changing `extendSearchResult: false → true` requires:
- Modal: Show/hide [all] section
- SearchEngine: Run additional search pass
- Tests: Verify [all] results appear correctly

### 3. Current File ↔ Link Analysis
Link analysis is **always** relative to current file:
- No current file → All files are "OTHER"
- Current file → Backlinks, outgoing, two-hop calculated

### 4. Property Filters ↔ Extended Results
Property filters create the "filtered" boundary:
- Files inside: Normal results
- Files outside: Extended results marked [all]
- The boundary must be consistent across empty/typed queries

## Feature Status

| Feature | Status | Test Coverage |
|---------|--------|---------------|
| Property Filters | ✅ Complete | 34 tests |
| Link Analysis | ✅ Complete | 23 tests |
| Result Grouping | ✅ Complete | 20 tests |
| LRU Cache | ✅ Complete | 24 tests |
| Empty Query | ✅ Complete | 4 integration tests |
| Extended Results | ✅ Complete | In SearchEngine |
| Current File Outside | ✅ Complete | Modal + SearchEngine |
| Workspace Rules | ✅ Complete | Manual testing |
| Settings UI | ✅ Complete | Manual testing |

## Change Impact Matrix

When changing...

| Component | Affects | Test to Run |
|-----------|---------|-------------|
| PropertyFilter operators | PropertyFilterEngine, SearchEngine | `npm test propertyFilter` |
| Link analysis logic | LinkAnalyzer, SearchEngine | `npm test linkAnalysis` |
| Result grouping | SearchEngine, Modal | `npm test searchUtils` |
| Priority sorting | SearchEngine, Modal | `npm test searchUtils` |
| LRU cache | RecentFilesTracker | `npm test lruCache` |
| SearchRule types | **ALL components** | `npm run type-check && npm test` |

## Detailed Documentation

- See @knowledge/bigpicture/PLAN.md for feature roadmap and progress
- See @knowledge/domain/DOMAIN.md for entity definitions
- See @knowledge/coding/CODING.md for implementation patterns
