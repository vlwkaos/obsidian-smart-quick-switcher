---
name: keyboard-event-handling
description: Pattern for handling keyboard events in Obsidian modals using scope.register
keywords: keyboard-events, scope-register, modal, event-handling, modifiers, obsidian-api
---

# Keyboard Event Handling

## Pattern for Modal Keyboard Events

When you need to intercept keyboard events in an Obsidian modal (especially FuzzySuggestModal), use the `Scope` API with `scope.register()`.

## Why Not Use onChooseItem/onChooseSuggestion?

**Problem**: These methods are only called when there's a suggestion to choose.

```typescript
// ❌ This won't work for empty results
onChooseSuggestion(item: FuzzyMatch<TFile>, evt: KeyboardEvent) {
  if (evt.shiftKey) {
    // This is NEVER called when suggestions.length === 0
  }
}
```

**When no matches exist**, the modal doesn't call these methods at all. Your event handler never runs.

## Solution: Use scope.register

Register keyboard handlers directly on the modal's scope:

```typescript
export class MyModal extends FuzzySuggestModal<TFile> {
  constructor(app: App) {
    super(app);
    
    // Register keyboard handler
    this.scope.register(['Shift'], 'Enter', (evt: KeyboardEvent) => {
      // This WILL be called even with no suggestions
      if (this.currentSuggestions.length === 0) {
        // Handle Shift+Enter with no matches
        evt.preventDefault();
        this.handleCreate();
        return false;
      }
      // Let default handler proceed if there are suggestions
    });
  }
}
```

## API Signature

```typescript
scope.register(
  modifiers: string[],  // ['Shift'], ['Ctrl'], ['Meta'], ['Alt'], or null
  key: string,          // 'Enter', 'Escape', 'ArrowDown', etc.
  func: (evt: KeyboardEvent, ctx: any) => any
)
```

**Modifiers**:
- `['Shift']` - Matches Shift+Key
- `['Ctrl']` - Matches Ctrl+Key
- `['Meta']` - Matches Cmd+Key (Mac) or Win+Key (Windows)
- `['Alt']` - Matches Alt+Key
- `null` - Matches Key regardless of modifiers (captures all)
- `[]` - Empty array does NOT work (won't capture modifier combinations)

**Key**:
- Use standard KeyboardEvent key values
- Examples: `'Enter'`, `'Escape'`, `'ArrowDown'`, `'a'`, `'1'`
- See: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values

**Return value**:
- `false` or `evt.preventDefault()` - Stops propagation
- `undefined` or `true` - Continues to next handler

## Common Patterns

### Pattern 1: Conditional Action Based on State

```typescript
this.scope.register(['Shift'], 'Enter', (evt: KeyboardEvent) => {
  if (this.shouldTriggerAction()) {
    evt.preventDefault();
    this.performAction();
    this.close();
    return false;
  }
  // Let default handler process if condition not met
});
```

### Pattern 2: Multiple Modifiers for Different Actions

```typescript
// Shift+Enter: Create
this.scope.register(['Shift'], 'Enter', (evt: KeyboardEvent) => {
  if (this.canCreate()) {
    this.createItem();
    return false;
  }
});

// Cmd+Enter: Open in new pane
this.scope.register(['Meta'], 'Enter', (evt: KeyboardEvent) => {
  if (this.hasSelection()) {
    this.openInNewPane();
    return false;
  }
});

// Ctrl+Enter: Open in new window
this.scope.register(['Ctrl'], 'Enter', (evt: KeyboardEvent) => {
  if (this.hasSelection()) {
    this.openInNewWindow();
    return false;
  }
});
```

### Pattern 3: Capture All Keys (Debugging)

```typescript
this.scope.register(null, 'Enter', (evt: KeyboardEvent) => {
  console.log('Enter pressed with modifiers:', {
    shift: evt.shiftKey,
    ctrl: evt.ctrlKey,
    meta: evt.metaKey,
    alt: evt.altKey
  });
});
```

## Real Example: Smart Quick Switcher

**Goal**: Shift+Enter creates new note when no matches found

**Implementation**:
```typescript
export class SmartQuickSwitcherModal extends FuzzySuggestModal<TFile> {
  private currentSuggestions: FuzzyMatch<TFile>[] = [];
  private lastQuery: string = '';

  constructor(app: App) {
    super(app);
    
    // Capture Shift+Enter
    this.scope.register(['Shift'], 'Enter', (evt: KeyboardEvent) => {
      // Only create if no suggestions
      if (this.currentSuggestions.length === 0) {
        evt.preventDefault();
        if (this.lastQuery && this.lastQuery.trim().length > 0) {
          this.createNewNote(this.lastQuery);
          this.close();
        }
        return false;
      }
      // If suggestions exist, let default handler open the file
    });
  }
  
  getSuggestions(query: string): FuzzyMatch<TFile>[] {
    this.lastQuery = query;
    const suggestions = super.getSuggestions(query);
    this.currentSuggestions = suggestions;  // Track for keyboard handler
    return suggestions;
  }
  
  private async createNewNote(fileName: string): Promise<void> {
    // Implementation...
  }
}
```

**Key points**:
1. Track `currentSuggestions` to check state in handler
2. Track `lastQuery` to use as filename
3. Check conditions before taking action
4. `evt.preventDefault()` and `return false` to stop default behavior
5. Close modal after action completes

## Debugging Tips

**Not triggering?**
```typescript
// Add debug logging
this.scope.register(['Shift'], 'Enter', (evt: KeyboardEvent) => {
  console.log('Shift+Enter triggered!', {
    suggestions: this.currentSuggestions.length,
    query: this.lastQuery
  });
  // ... rest of handler
});
```

**Wrong modifier array?**
- ❌ `scope.register([], 'Enter', ...)` - Won't capture Shift
- ✅ `scope.register(['Shift'], 'Enter', ...)` - Will capture Shift+Enter
- ✅ `scope.register(null, 'Enter', ...)` - Captures all Enter (any modifiers)

**Event fired but action doesn't happen?**
- Check your conditional logic (`if (this.currentSuggestions.length === 0)`)
- Make sure state variables are updated (e.g., in `getSuggestions()`)
- Verify `evt.preventDefault()` is called

## When to Use This Pattern

✅ **Use scope.register when**:
- Need to handle keys when modal has no suggestions
- Want to intercept events before modal's default handling
- Implementing custom keyboard shortcuts in modal
- Need modifier key combinations (Shift+Enter, Cmd+K, etc.)

❌ **Don't use when**:
- Just want to handle selection of an existing item (use `onChooseItem/onChooseSuggestion`)
- Don't need modifier keys
- Simple click/enter handling on selected suggestion

## Related Concepts

- See @knowledge/domain/modifier-key-actions.md for the feature this pattern enables
- See @knowledge/coding/pure-functions-pattern.md for extracting modifier key logic to testable utils
