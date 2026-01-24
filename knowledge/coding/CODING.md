# Coding Best Practices

Project-specific coding patterns, standards, and best practices.
Use @knowledge/coding/filename.md syntax for references.

## Patterns

- **Pure Functions Pattern** - @knowledge/coding/pure-functions-pattern.md - Extract testable logic from Obsidian-dependent components
- **Service Layer Pattern** - @knowledge/coding/service-layer-pattern.md - Separation of concerns with dedicated service classes
- **Modal Architecture** - @knowledge/coding/modal-architecture.md - Extending FuzzySuggestModal with custom search logic
- **Keyboard Event Handling** - @knowledge/coding/keyboard-event-handling.md - Using scope.register for modal keyboard events

## Architecture

- **Utility Extraction** - @knowledge/coding/utility-extraction.md - Moving logic to src/utils/ for testability
- **Type-Driven Design** - @knowledge/coding/type-driven-design.md - Using TypeScript interfaces to guide implementation

## Testing

- **Pure Function Testing** - @knowledge/coding/pure-function-testing.md - Testing business logic without Obsidian API mocks
- **Test Coverage Strategy** - @knowledge/coding/test-coverage-strategy.md - What to test, what not to test, and why

## Standards

- **Sorting Priority** - @knowledge/coding/sorting-priority.md - Group priority first, then match score
- **Result Augmentation** - @knowledge/coding/result-augmentation.md - How filtered and non-filtered results are combined
