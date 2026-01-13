# Utility Extraction

**Purpose**: Process for moving logic from components to testable utilities
**Read when**: Need to refactor complex component logic
**Skip when**: Logic is already in utils/ or is simple glue code

---

## When to Extract

Extract logic to utils/ when:
- Logic is complex (>15 lines)
- Logic has edge cases to test
- Logic is pure (no Obsidian API calls)
- Logic might break if refactored
- Logic might be reused

Don't extract when:
- Logic is trivial (< 5 lines)
- Tightly coupled to Obsidian API
- One-time throw-away code

## Extraction Process

### 1. Identify the Logic
Find complex logic in components:
```typescript
// In Modal
getSuggestions(query: string): FuzzyMatch<TFile>[] {
  // 50 lines of sorting, filtering, augmenting logic
}
```

### 2. Define Interface
Create types for inputs/outputs:
```typescript
// In utils/suggestionUtils.ts
export interface SuggestionMatch {
  file: TFile;
  score: number;
  group: ResultGroup;
  priority: number;
}

export type FuzzySearchFn = (text: string) => { score: number; matches: [...] } | null;
```

### 3. Extract Pure Function
Move logic to utils with no dependencies:
```typescript
// In utils/suggestionUtils.ts
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
```

### 4. Write Tests First
Before using the function, write comprehensive tests:
```typescript
// In utils/suggestionUtils.test.ts
describe('sortSuggestionsByPriorityAndScore', () => {
  it('sorts by priority first');
  it('sorts by score within same priority');
  it('does not mutate original array');
  it('handles empty array');
});
```

### 5. Update Component
Replace inline logic with utility call:
```typescript
// In Modal
getSuggestions(query: string): FuzzyMatch<TFile>[] {
  const suggestions = super.getSuggestions(query);
  
  // Convert to SuggestionMatch format
  const matches = suggestions.map(s => ({
    file: s.item,
    score: s.match.score,
    group: this.getGroup(s.item),
    priority: this.getPriority(s.item)
  }));
  
  // Use tested utility
  const sorted = sortSuggestionsByPriorityAndScore(matches);
  
  // Convert back to Obsidian format
  return sorted.map(toFuzzyMatch);
}
```

### 6. Run Tests
Verify tests pass:
```bash
npm test -- suggestionUtils
```

## File Organization

```
src/utils/
├── suggestionUtils.ts          # Pure functions
├── suggestionUtils.test.ts     # Tests
├── propertyFilterUtils.ts      # Pure functions
├── propertyFilterUtils.test.ts # Tests
└── ...
```

**Naming:**
- `*Utils.ts` - Utility module
- `*Utils.test.ts` - Test file
- camelCase for filenames

## Real Example: Modal Refactor

**Before:**
```typescript
getSuggestions(query: string): FuzzyMatch<TFile>[] {
  const filteredSuggestions = super.getSuggestions(query);
  
  // 40 lines of sorting logic (untested, broke during refactor)
  filteredSuggestions.sort((a, b) => {
    const resultA = this.fileToResultMap.get(a.item.path);
    // ... complex logic
  });
  
  // 30 lines of non-filtered augmentation (untested)
  if (this.activeRule.showNonFiltered) {
    const allFiles = this.app.vault.getMarkdownFiles();
    // ... complex logic
  }
  
  return combined;
}
```

**After:**
```typescript
getSuggestions(query: string): FuzzyMatch<TFile>[] {
  const filteredSuggestions = super.getSuggestions(query);
  
  const matches = toSuggestionMatches(filteredSuggestions, this.fileToResultMap);
  const sorted = sortSuggestionsByPriorityAndScore(matches);
  
  if (this.activeRule.showNonFiltered && sorted.length > 0) {
    const allFiles = this.app.vault.getMarkdownFiles();
    const nonFiltered = findNonFilteredMatches(
      allFiles,
      new Set(sorted.map(m => m.file.path)),
      query,
      prepareFuzzySearch(query)
    );
    
    return combineSuggestions(sorted, nonFiltered, this.maxSuggestions)
      .map(toFuzzyMatch);
  }
  
  return sorted.map(toFuzzyMatch);
}
```

**Result:**
- 19 tests covering all edge cases
- Search functionality protected
- Future refactors safe

## Related Concepts

- See @knowledge/coding/pure-functions-pattern.md for pattern details
- See @knowledge/coding/test-coverage-strategy.md for what to test
- See @knowledge/coding/service-layer-pattern.md for service code
