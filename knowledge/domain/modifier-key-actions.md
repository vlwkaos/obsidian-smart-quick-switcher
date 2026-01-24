---
name: modifier-key-actions
description: Keyboard modifier behavior (Shift+Enter) for creating new notes when no match found
keywords: modifier-keys, shift-enter, keyboard-events, create-note, scope-register, user-interaction
---

# Modifier Key Actions

## What Are Modifier Key Actions?

Actions triggered by keyboard modifier keys (Shift, Cmd, Ctrl, Alt) combined with Enter in the search modal. Currently supports Shift+Enter to create new notes.

## Implemented Modifiers

### Shift+Enter

**Behavior**: Creates a new note with the query text as filename

**When it triggers**:
- User has typed a query
- No matching files found in suggestions
- User presses Shift+Enter

**What happens**:
1. Query text sanitized (removes invalid filename characters: `\ / : * ? " < > |`)
2. Default folder determined using `app.fileManager.getNewFileParent()` (respects user's Obsidian settings)
3. Check if file already exists at path
4. If exists: Open existing file
5. If not: Create new file with template content (if configured)
6. Open the newly created file

**Edge cases**:
- Empty query: Do nothing (can't create note without name)
- Special characters in query: Sanitized automatically
- Duplicate filename: Opens existing file instead
- Query with only spaces: Treated as empty

### Future Modifiers (Reserved)

- **Cmd+Enter**: Open in new pane (not implemented)
- **Ctrl+Enter**: Open in new window (not implemented)

## Implementation Details

### Event Handling

Uses Obsidian's Scope API to register keyboard handlers:

```typescript
this.scope.register(['Shift'], 'Enter', (evt: KeyboardEvent) => {
  if (this.currentSuggestions.length === 0) {
    // Create new note
  }
});
```

**Why not `onChooseSuggestion()`?**
- Only called when there ARE suggestions to choose
- When no matches exist, modal doesn't call this method
- `scope.register` intercepts keyboard events before modal's default handling

### Selection vs No Selection

**With selection (has matches)**:
- Shift+Enter: Opens selected file (ignores Shift modifier)
- Enter: Opens selected file

**Without selection (no matches)**:
- Shift+Enter: Creates new note
- Enter: Does nothing

This matches the pure function logic in `modifierKeyUtils.ts`:
```typescript
getModifierAction(modifiers, hasSelection)
  // hasSelection = true → OPEN_NORMAL (ignore shift)
  // hasSelection = false + shift → CREATE_NOTE
```

## Template Variables

When creating a note with a template configured, these variables are replaced:

| Variable | Replaced With | Example |
|----------|---------------|---------|
| `{{title}}` | Query text | "My New Note" |
| `{{date}}` | Current date (YYYY-MM-DD) | "2026-01-24" |
| `{{time}}` | Current time (HH:mm:ss) | "10:30:45" |
| `{{datetime}}` | Combined date:time | "2026-01-24:10:30:45" |
| `{{year}}` | Current year | "2026" |
| `{{month}}` | Current month (padded) | "01" |
| `{{day}}` | Current day (padded) | "24" |
| `{{hour}}` | Current hour (padded) | "10" |
| `{{minute}}` | Current minute (padded) | "30" |
| `{{second}}` | Current second (padded) | "45" |

**Template example**:
```yaml
---
title: "{{title}}"
created: "{{date}}:{{time}}"
---

# {{title}}
```

**Becomes** (for note "My Idea" on 2026-01-24 at 10:30:45):
```yaml
---
title: "My Idea"
created: "2026-01-24:10:30:45"
---

# My Idea
```

## Footer Instructions

The modal footer dynamically updates based on state:

**Empty query or has matches**:
```
↵ to open
```

**Query with no matches**:
```
shift ↵ to create
```

This provides contextual guidance to the user about available actions.

## Default Note Location

Respects Obsidian's "Default location for new notes" setting:
- **Root folder**: Creates in vault root
- **Same folder as current file**: Creates next to active file
- **Specific folder**: Creates in configured folder

Uses `app.fileManager.getNewFileParent(currentFile?.path || "")` to determine location automatically.

## Related Concepts

- See @knowledge/coding/keyboard-event-handling.md for event handling implementation
- See @knowledge/coding/pure-functions-pattern.md for modifier key logic testing
- See @knowledge/domain/search-flow.md for how this integrates with search
