# Service Layer Pattern

**Purpose**: Separation of concerns using dedicated service classes for different responsibilities
**Read when**: Adding new features that interact with Obsidian API
**Skip when**: Writing pure utility functions

---

## What is the Service Layer?

Service classes encapsulate Obsidian API interactions and delegate business logic to pure utility functions. They extract data from the Obsidian ecosystem and pass it to testable functions.

## Service Classes in Plugin

### SearchEngine
**Responsibility**: Orchestrate the complete search flow
- Apply property filters
- Perform query search
- Add non-filtered results
- Coordinate other services

**Key Method**: `search(query, rule, currentFile): SearchResult[]`

### LinkAnalyzer
**Responsibility**: Analyze link relationships between files
- Get outgoing links from current file
- Get backlinks to current file
- Calculate two-hop links
- Use MetadataCache for data

**Key Method**: `getCategorizedLinks(file): CategorizedLinks`

### PropertyFilterEngine
**Responsibility**: Filter files by frontmatter metadata
- Read file frontmatter from MetadataCache
- Apply filter operators
- Return filtered file list

**Key Method**: `filterFiles(files, filters): TFile[]`

### RecentFilesTracker
**Responsibility**: Track recently opened files using LRU cache
- Maintain ordered list of recent files
- Add files when opened
- Evict oldest when capacity reached

**Key Methods**:
- `addRecentFile(path): void`
- `getRecentFiles(): string[]`
- `getRecentTFiles(): TFile[]`

## Pattern Structure

```typescript
export class ServiceClass {
  private app: App;  // Obsidian API access
  
  constructor(app: App, ...dependencies) {
    this.app = app;
  }
  
  public doSomething(...params): Result {
    // 1. Extract data from Obsidian API
    const data = this.app.vault.getMarkdownFiles();
    const metadata = this.app.metadataCache.getFileCache(file);
    
    // 2. Call pure utility function with extracted data
    const result = pureUtilityFunction(data, metadata, params);
    
    // 3. Return result (optionally wrap in Obsidian types)
    return result;
  }
}
```

## Key Principles

### Keep Services Thin
Services should be thin wrappers:
- Extract data from Obsidian
- Call pure functions
- Return results

**Don't** put complex business logic in services.

### Delegate to Utils
When logic gets complex:
```typescript
// Bad: Complex logic in service
public search(query: string): SearchResult[] {
  const files = this.app.vault.getMarkdownFiles();
  
  // 50 lines of sorting/filtering logic here...
  
  return results;
}

// Good: Delegate to pure function
public search(query: string): SearchResult[] {
  const files = this.app.vault.getMarkdownFiles();
  const cache = this.app.metadataCache;
  
  return searchUtils.performSearch(files, cache, query);
}
```

### Dependency Injection
Pass dependencies through constructor:
```typescript
export class SearchEngine {
  constructor(
    private app: App,
    private linkAnalyzer: LinkAnalyzer,
    private propertyFilter: PropertyFilterEngine,
    private recentFiles: RecentFilesTracker
  ) {}
}
```

**Benefits:**
- Clear dependencies
- Easy to test with mocks (if needed)
- Loose coupling

## Testing Strategy

Services are **not typically unit tested** because:
- Tightly coupled to Obsidian API
- Complex mocking required
- Pure functions are tested instead

**If you must test services:**
- Integration tests with mock Obsidian objects
- Focus on data extraction, not business logic
- Use manual testing in Obsidian for validation

## Example: SearchEngine

```typescript
export class SearchEngine {
  constructor(
    private app: App,
    private linkAnalyzer: LinkAnalyzer,
    private propertyFilter: PropertyFilterEngine,
    private recentFiles: RecentFilesTracker
  ) {}
  
  public search(query: string, rule: SearchRule, currentFile: TFile | null): SearchResult[] {
    // Data extraction from Obsidian
    const allFiles = this.app.vault.getMarkdownFiles();
    const filteredFiles = this.propertyFilter.filterFiles(allFiles, rule.propertyFilters);
    
    if (!query) {
      // Delegate grouping to getGroupedResults (which uses utils internally)
      return this.getGroupedResults(filteredFiles, rule, currentFile);
    }
    
    // Delegate searching to searchByQuery
    const matchedFiles = this.searchByQuery(filteredFiles, query, rule);
    
    // Delegate grouping
    let results = this.getGroupedResults(matchedFiles, rule, currentFile);
    
    // Handle non-filtered results
    if (rule.showNonFiltered && matchedFiles.length > 0) {
      const filteredPaths = new Set(filteredFiles.map(f => f.path));
      const nonFilteredFiles = allFiles.filter(f => !filteredPaths.has(f.path));
      const nonFilteredMatches = this.searchByQuery(nonFilteredFiles, query, rule);
      
      // Augment with non-filtered results
      const nonFilteredResults = nonFilteredMatches.map(file => ({
        file,
        group: ResultGroup.NON_FILTERED,
        priority: 1000
      }));
      
      results = results.concat(nonFilteredResults);
    }
    
    return results;
  }
  
  private searchByQuery(files: TFile[], query: string, rule: SearchRule): TFile[] {
    // Fuzzy search implementation
    // Returns scored and sorted files
  }
  
  private getGroupedResults(files: TFile[], rule: SearchRule, currentFile: TFile | null): SearchResult[] {
    // Group files and assign priorities
    // Returns categorized results
  }
}
```

## When to Create a Service

Create a new service class when:
- Need to encapsulate related Obsidian API calls
- Have multiple operations on the same data source
- Want to hide implementation details
- Need dependency injection

Don't create a service for:
- Pure calculations (use utils/)
- One-off API calls (inline in component)
- No Obsidian API dependency (use utils/)

## Related Concepts

- See @knowledge/coding/pure-functions-pattern.md for logic extraction
- See @knowledge/coding/utility-extraction.md for moving logic to utils
- See @knowledge/coding/test-coverage-strategy.md for testing approach
