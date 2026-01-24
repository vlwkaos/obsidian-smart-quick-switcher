---
name: pure-functions-pattern
description: Pattern for extracting testable business logic from UI components into pure utils
keywords: pure-functions, testability, utils, obsidian-api, separation-of-concerns, maintainability, testing
---

# Pure Functions Pattern

## What is the Pure Functions Pattern?

Extract business logic into pure functions (no side effects, no Obsidian API dependencies) in `src/utils/`, while keeping Obsidian-dependent code in service classes or components.

## Benefits

### Testability
- Test business logic without mocking Obsidian API
- Fast tests (no framework overhead)
- Reliable tests (no complex mocking)

### Maintainability
- Logic separated from framework
- Easy to understand and modify
- Can be verified independently

### Reliability
- Business logic covered by comprehensive tests
- Changes to UI don't break logic
- Changes to logic are caught by tests

## Structure

```
src/
├── SmartQuickSwitcherModal.ts     # UI component (Obsidian-dependent)
├── SearchEngine.ts                # Service class (Obsidian-dependent)
└── utils/
    ├── suggestionUtils.ts         # Pure functions
    └── suggestionUtils.test.ts    # Unit tests
```

## Example: Suggestion Sorting

### Wrong Approach (Inline Logic)
```typescript
// In SmartQuickSwitcherModal.ts
getSuggestions(query: string): FuzzyMatch<TFile>[] {
  const suggestions = super.getSuggestions(query);
  
  // Complex sorting logic inline
  suggestions.sort((a, b) => {
    const resultA = this.fileToResultMap.get(a.item.path);
    const resultB = this.fileToResultMap.get(b.item.path);
    const priorityA = resultA?.priority ?? 999;
    const priorityB = resultB?.priority ?? 999;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    return b.match.score - a.match.score;
  });
  
  return suggestions;
}
```

**Problems:**
- Can't test sorting logic without creating a Modal
- Can't test without mocking Obsidian's FuzzySuggestModal
- If logic breaks, tests don't catch it

### Right Approach (Pure Function)
```typescript
// In src/utils/suggestionUtils.ts
export interface SuggestionMatch {
  file: TFile;
  score: number;
  group: ResultGroup;
  priority: number;
}

export function sortSuggestionsByPriorityAndScore(
  suggestions: SuggestionMatch[]
): SuggestionMatch[] {
  const sorted = [...suggestions];
  
  sorted.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return b.score - a.score;
  });
  
  return sorted;
}

// In src/utils/suggestionUtils.test.ts
describe('sortSuggestionsByPriorityAndScore', () => {
  it('sorts by priority first, then by score', () => {
    const suggestions = [
      { file: file1, score: 50, group: ResultGroup.OTHER, priority: 999 },
      { file: file2, score: 100, group: ResultGroup.RECENT, priority: 1 }
    ];
    
    const sorted = sortSuggestionsByPriorityAndScore(suggestions);
    
    expect(sorted[0].priority).toBe(1);
    expect(sorted[1].priority).toBe(999);
  });
});

// In SmartQuickSwitcherModal.ts
getSuggestions(query: string): FuzzyMatch<TFile>[] {
  const suggestions = super.getSuggestions(query);
  
  // Convert to SuggestionMatch
  const matches = suggestions.map(s => ({
    file: s.item,
    score: s.match.score,
    group: this.fileToResultMap.get(s.item.path)?.group ?? ResultGroup.OTHER,
    priority: this.fileToResultMap.get(s.item.path)?.priority ?? 999
  }));
  
  // Use tested pure function
  const sorted = sortSuggestionsByPriorityAndScore(matches);
  
  // Convert back to FuzzyMatch
  return sorted.map(m => ({
    item: m.file,
    match: { score: m.score, matches: [] }
  }));
}
```

**Benefits:**
- Sorting logic fully tested (19 tests)
- No Obsidian mocking needed
- Modal is thin wrapper around tested logic
- If sorting breaks, tests fail immediately

## Pattern Checklist

When adding complex logic:

1. **Can this be a pure function?**
   - No Obsidian API calls
   - No side effects
   - Only depends on inputs

2. **Where should it go?**
   - Business logic → `src/utils/`
   - Data extraction → Service class
   - UI glue → Component

3. **What should be tested?**
   - Pure functions → Comprehensive unit tests
   - Service classes → Integration tests (optional)
   - Components → Manual testing

4. **What's the interface?**
   - Define clear input/output types
   - Use simple TypeScript interfaces
   - No Obsidian types in utils (use TFile for files only)

## Real Example from Plugin

**Problem:** Modal's `getSuggestions()` broke search when refactored.

**Root Cause:** No tests for suggestion sorting/matching logic.

**Solution:** Extract to `suggestionUtils.ts` with 19 comprehensive tests.

**Result:** 
- Logic is now tested independently
- Future changes won't break search
- Modal is simpler and more maintainable

## When NOT to Use This Pattern

Don't extract if:
- Logic is trivial (< 5 lines)
- Tightly coupled to Obsidian API (must call API in every step)
- One-off implementation (not reused, not complex)

## Related Concepts

- See @knowledge/coding/test-coverage-strategy.md for what to test
- See @knowledge/coding/service-layer-pattern.md for Obsidian-dependent code
- See @knowledge/coding/utility-extraction.md for extraction process
