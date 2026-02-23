# Smart Quick Switcher

An enhanced file switcher for Obsidian with workspace-aware filtering, property-based search rules, and intelligent link prioritization.

## Features

### 🎯 Configurable Search Rules
Create multiple search rules with different property filters and assign them to workspaces.

### 🏷️ Property-Based Filtering
Filter files by frontmatter properties using operators: equals, not-equals, contains, exists, not-exists.

### 📊 Smart Result Prioritization
Results are grouped and ordered by:
- 🕒 **Recent files** - Recently opened files (LRU cache)
- 🔗 **Two-hop links** - Files linked by files that link to current file
- ⬅️ **Backlinks** - Files that link to current file
- 📄 **Other files** - All other matching files

Each group can be enabled/disabled and reordered by priority.

### 💼 Workspace Integration
Assign different search rules to different workspaces. Automatically use the right rule when switching workspaces. Requires the core Workspaces plugin.

### 🔍 Advanced Search Options
Per-rule configuration:
- Fuzzy search
- Search in content, tags, properties
- Fallback to all files when no results

## Usage

### Creating Search Rules

1. Open Settings → Smart Quick Switcher
2. Click "Add New Rule"
3. Configure property filters, search options, and result priorities
4. Optionally assign the rule to a workspace

### Opening the Switcher

**Workspace-aware command** (recommended):
- "Smart Quick Switcher: Open (workspace default)"
- Uses the rule for your current workspace
- Assign a hotkey for quick access

**Rule-specific commands**:
- "Smart Quick Switcher: Open: [Rule Name]"
- One command per rule for direct access

## Examples

### Public Notes Only
Filter to notes with `access: public`:
- Property filter: `access equals public`
- Result order: Recent → Two-hop → Backlinks

### Work Notes (Not Drafts)
Filter to work notes excluding drafts:
- Property filters: `tags contains work`, `draft not-equals true`
- Result order: Recent → Backlinks

## Settings

### General
- **Max suggestions** - Maximum results to show (default: 50)
- **Show directory path** - Display file paths in results
- **Recent files limit** - LRU cache size (default: 4)

### Search Rules
- **Rule name** - Descriptive name
- **Property filters** - Filter by frontmatter
- **Search options** - Fuzzy search, content/tags/properties search
- **Result priorities** - Reorder result groups
- **Fallback** - Search all files when no matches

### Workspace Rules
Assign search rules to workspaces for automatic rule switching.

## Development

### Setup

Clone this repo **outside** your Obsidian vault, then:

```bash
# Install dependencies
npm install

# Build and symlink into your vault (replace "my-vault" with your vault directory name)
npm run setup -- my-vault
```

The setup script searches `~/`, `~/Documents/`, and `~/Desktop/` for a directory named `my-vault` that contains `.obsidian/`. You can also pass an absolute path.

After setup, enable the plugin in Obsidian → Settings → Community Plugins.

### Development commands

```bash
# Watch mode (auto-rebuild on change)
npm run dev

# Build for production
npm run build

# Re-link to vault after manual build
npm run link -- my-vault

# Run tests
npm test

# Type checking
npm run type-check
```

## License

MIT

## Author

vlwkaos
