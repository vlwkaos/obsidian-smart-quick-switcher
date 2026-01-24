---
name: test-coverage-strategy
description: Guidelines on what to test (pure utils), what not to test (services, UI), and why
keywords: testing, test-coverage, pure-functions, vitest, unit-tests, integration-tests, manual-qa
---

# Test Coverage Strategy

## Current Test Coverage

**Total: 141 tests passing**
- Property filter utils: 34 tests
- Link analysis utils: 23 tests
- Search utils: 20 tests
- LRU cache utils: 24 tests
- Suggestion utils: 19 tests
- Integration tests: 4 tests
- Other utils: 17 tests

## What to Test (with Tests)

### Pure Utility Functions ✅
**Test thoroughly** - These are the core business logic.

Location: `src/utils/*.ts`
Examples:
- `propertyFilterUtils.ts` - All operators, edge cases
- `linkAnalysisUtils.ts` - Graph traversal, relationship detection
- `suggestionUtils.ts` - Sorting, matching, combining

**Why test:**
- No Obsidian dependencies = easy to test
- Business logic that must be correct
- Changes here break features

**Coverage goal:** 80%+ line coverage

### Integration Flows ✅
**Test key scenarios** - Ensure components work together.

Location: `src/utils/*.test.ts` (integration test files)
Examples:
- `emptyQuerySearch.test.ts` - End-to-end empty query flow

**Why test:**
- Verify utility functions compose correctly
- Catch integration bugs
- Document expected behavior

**Coverage goal:** Major flows covered (3-5 tests per flow)

## What NOT to Test (no tests)

### Service Classes ❌
**Don't test** - Tightly coupled to Obsidian API.

Examples:
- `SearchEngine.ts`
- `LinkAnalyzer.ts`
- `PropertyFilterEngine.ts`
- `RecentFilesTracker.ts`

**Why skip:**
- Require complex Obsidian API mocking
- Thin wrappers around tested utils
- Business logic is in utils (already tested)
- Manual testing in Obsidian is more effective

**Testing strategy:** Manual QA in Obsidian

### UI Components ❌
**Don't test** - Obsidian framework dependencies.

Examples:
- `SmartQuickSwitcherModal.ts`
- `SettingsTab.ts`

**Why skip:**
- Extend Obsidian classes (hard to mock)
- Mostly UI glue code
- Logic extracted to utils (tested separately)
- Visual behavior tested manually

**Testing strategy:** Manual QA in Obsidian

### Plugin Main Class ❌
**Don't test** - Plugin lifecycle management.

Example:
- `main.ts`

**Why skip:**
- Initializes plugin (no business logic)
- Registers commands and settings
- Framework lifecycle code
- Tests would just verify Obsidian API calls

**Testing strategy:** Load plugin in Obsidian

## Testing Principles

### 1. Test Business Logic, Not Framework Glue

**Test:**
```typescript
// Pure function with business logic
export function matchesPropertyFilter(
  value: PropertyValue,
  operator: PropertyFilterOperator,
  filterValue: string
): boolean {
  // Complex logic here
}
```

**Don't Test:**
```typescript
// Framework glue in Modal
onOpen() {
  this.searchEngine = new SearchEngine(this.app, ...);
  this.modal.open();
}
```

### 2. Test Edge Cases and Errors

For each pure function, test:
- Happy path (expected input)
- Edge cases (empty, null, undefined)
- Boundary conditions (limits, extremes)
- Error conditions (invalid input)

Example from `propertyFilterUtils.test.ts`:
```typescript
describe('equals operator', () => {
  it('matches when values are equal');
  it('does not match when values differ');
  it('handles undefined values');
  it('handles array values');
  it('is case-sensitive');
});
```

### 3. Test Behavior, Not Implementation

**Good test (behavior):**
```typescript
it('sorts by priority first, then by score', () => {
  const input = [...];
  const result = sortSuggestions(input);
  
  expect(result[0].priority).toBe(1);
  expect(result[1].priority).toBe(1);
  expect(result[0].score).toBeGreaterThan(result[1].score);
});
```

**Bad test (implementation):**
```typescript
it('calls Array.sort with correct comparator', () => {
  const spy = jest.spyOn(Array.prototype, 'sort');
  sortSuggestions(input);
  expect(spy).toHaveBeenCalled();
});
```

### 4. Keep Tests Simple and Readable

- Use clear test names
- One concept per test
- Arrange-Act-Assert pattern
- No complex test logic

## When Tests Prevented Bugs

### Real Example: Suggestion Sorting
**Before extraction:**
- Modal had inline sorting logic
- No tests
- Refactor broke search completely
- Discovered only in manual testing

**After extraction:**
- Logic moved to `suggestionUtils.ts`
- 19 comprehensive tests added
- Refactors caught by tests immediately
- Confidence in changes increased

### What Tests Caught
- Incorrect priority sorting (group order wrong)
- Missing score sorting within groups
- Immutability violations (original array modified)
- Edge cases (empty results, null values)

## Test Organization

```
src/utils/
├── suggestionUtils.ts         # Pure functions
├── suggestionUtils.test.ts    # Unit tests (19 tests)
├── propertyFilterUtils.ts     # Pure functions
├── propertyFilterUtils.test.ts # Unit tests (34 tests)
└── emptyQuerySearch.test.ts   # Integration tests (4 tests)
```

**Pattern:**
- One test file per utility file
- Integration tests in separate files
- Test files colocated with source

## Running Tests

```bash
# All tests
npm test

# Watch mode (during development)
npm run test:watch

# Specific file
npm test -- suggestionUtils

# With coverage
npm test -- --coverage
```

## Coverage Goals

- **Pure utils:** 80%+ line coverage
- **Service classes:** 0% (not tested)
- **UI components:** 0% (not tested)
- **Overall project:** ~60% (mostly utils)

**Why not 100%?**
- Framework-dependent code not worth testing
- Diminishing returns on edge cases
- Manual QA more effective for UI

## When Adding New Code

**Decision tree:**

1. **Is it pure logic (no Obsidian API)?**
   - Yes → Extract to `utils/`, write tests ✅
   - No → Continue

2. **Is it a service class (thin wrapper)?**
   - Yes → No tests, delegate to utils ❌
   - No → Continue

3. **Is it UI code?**
   - Yes → No tests, manual QA ❌

## Related Concepts

- See @knowledge/coding/pure-functions-pattern.md for extraction pattern
- See @knowledge/coding/service-layer-pattern.md for service testing approach
- See @knowledge/coding/utility-extraction.md for moving logic to utils
