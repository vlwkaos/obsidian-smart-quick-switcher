import { App, FuzzySuggestModal, TFile, FuzzyMatch, prepareFuzzySearch } from 'obsidian';
import { SearchRule, SearchResult, ResultGroup } from './types';
import { SearchEngine } from './SearchEngine';
import { findNonFilteredMatches } from './utils/suggestionUtils';
import { filterByExcludedPaths } from './utils/pathFilterUtils';

/**
 * Modal for smart quick switcher file switching
 */
export class SmartQuickSwitcherModal extends FuzzySuggestModal<TFile> {
	private searchEngine: SearchEngine;
	private activeRule: SearchRule;
	private showDirectory: boolean;
	private maxSuggestions: number;
	private fileToResultMap: Map<string, SearchResult>;
	private lastQuery: string;
	private usingFallback: boolean;

	constructor(
		app: App,
		searchEngine: SearchEngine,
		activeRule: SearchRule,
		showDirectory: boolean,
		maxSuggestions: number,
		currentFileOutsideFilters: boolean = false
	) {
		super(app);
		this.searchEngine = searchEngine;
		this.activeRule = activeRule;
		this.showDirectory = showDirectory;
		this.maxSuggestions = maxSuggestions;
		this.fileToResultMap = new Map();
		this.lastQuery = '';
		this.usingFallback = false;

		// Set placeholder based on current file status
		if (currentFileOutsideFilters) {
			this.setPlaceholder('Current file outside filter - showing related files...');
		} else {
			this.setPlaceholder('Search files...');
		}
		this.limit = maxSuggestions;
	}

	getItems(): TFile[] {
		// Get property-filtered files (without search query)
		const currentFile = this.app.workspace.getActiveFile();
		const results = this.searchEngine.search('', this.activeRule, currentFile);
		
		// Build map for rendering
		this.fileToResultMap.clear();
		for (const result of results) {
			this.fileToResultMap.set(result.file.path, result);
		}
		
		this.usingFallback = false;
		const files = results.map(r => r.file);
		
		console.log('[SmartQuickSwitcher] getItems() called, filtered files:', files.length);
		
		return files;
	}

	getSuggestions(query: string): FuzzyMatch<TFile>[] {
		this.lastQuery = query;
		
		// Get base suggestions from parent class (searches within getItems() results)
		const suggestions = super.getSuggestions(query);
		
		console.log('[SmartQuickSwitcher] getSuggestions query:', `"${query}"`, '| base matches:', suggestions.length, '| extendSearchResult:', this.activeRule.extendSearchResult);
		
		// If query is empty, return base suggestions (already handled by getItems())
		if (!query || query.trim().length === 0) {
			return suggestions;
		}
		
		// If extendSearchResult enabled, also search ALL candidate files and append [all] results
		if (this.activeRule.extendSearchResult) {
			console.log('[SmartQuickSwitcher] Searching all candidate files for extended results');
			
			const allFiles = this.app.vault.getMarkdownFiles();
			const candidateFiles = filterByExcludedPaths(allFiles, this.activeRule.excludedPaths);
			const existingPaths = new Set(suggestions.map(s => s.item.path));
			
			// Use utility function to find and sort non-filtered matches
			const fuzzySearch = prepareFuzzySearch(query);
			const nonFilteredMatches = findNonFilteredMatches(
				candidateFiles,
				existingPaths,
				query,
				fuzzySearch
			);
			
			// Add to map for rendering with [all] label
			for (const match of nonFilteredMatches) {
				this.fileToResultMap.set(match.file.path, {
					file: match.file,
					group: ResultGroup.NON_FILTERED,
					priority: 1000
				});
			}
			
			// Convert to FuzzyMatch format
			const extendedMatches: FuzzyMatch<TFile>[] = nonFilteredMatches.map(m => ({
				item: m.file,
				match: { score: m.score, matches: [] }
			}));
			
			console.log('[SmartQuickSwitcher] Extended matches found:', extendedMatches.length);
			
			// Combine base + extended, limit to maxSuggestions
			return [...suggestions, ...extendedMatches].slice(0, this.maxSuggestions);
		}
		
		return suggestions;
	}

	getItemText(file: TFile): string {
		return file.basename;
	}

	renderSuggestion(match: FuzzyMatch<TFile>, el: HTMLElement): void {
		const file = match.item;
		const result = this.fileToResultMap.get(file.path);
		
		el.addClass('smart-quick-switcher-item');

		// Add dimmed styling for non-filtered results
		if (result && result.group === ResultGroup.NON_FILTERED) {
			el.addClass('smart-quick-switcher-item-non-filtered');
		}

		// Add group label
		if (result && result.group !== ResultGroup.OTHER) {
			const label = this.getGroupLabel(result.group);
			if (label) {
				const labelEl = el.createSpan({ cls: 'smart-quick-switcher-label' });
				labelEl.setText(`[${label}]`);
			}
		}

		// Add file name with fuzzy match highlighting
		const nameEl = el.createSpan();
		nameEl.setText(file.basename);

		// Add directory path if enabled
		if (this.showDirectory && file.parent) {
			const pathEl = el.createSpan({ cls: 'smart-quick-switcher-path' });
			pathEl.setText(file.parent.path);
		}
	}

	onChooseItem(file: TFile, evt: MouseEvent | KeyboardEvent): void {
		// Open the selected file
		this.app.workspace.getLeaf().openFile(file);
	}

	/**
	 * Get label for result group
	 */
	private getGroupLabel(group: ResultGroup): string | null {
		switch (group) {
			case ResultGroup.RECENT:
				return 'recent';
			case ResultGroup.OUTGOING:
				return 'out';
			case ResultGroup.BACKLINK:
				return 'back';
			case ResultGroup.TWO_HOP:
				return 'related';
			case ResultGroup.NON_FILTERED:
				return 'all';
			case ResultGroup.OTHER:
				return null;  // No label for other files
			default:
				return null;
		}
	}
}
