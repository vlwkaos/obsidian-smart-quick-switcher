import { App, FuzzySuggestModal, TFile, FuzzyMatch, prepareFuzzySearch } from 'obsidian';
import { SearchRule, SearchResult, ResultGroup } from './types';
import { SearchEngine } from './SearchEngine';

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
		maxSuggestions: number
	) {
		super(app);
		this.searchEngine = searchEngine;
		this.activeRule = activeRule;
		this.showDirectory = showDirectory;
		this.maxSuggestions = maxSuggestions;
		this.fileToResultMap = new Map();
		this.lastQuery = '';
		this.usingFallback = false;

		this.setPlaceholder('Search files...');
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
		
		// Get base filtered suggestions from parent class
		const suggestions = super.getSuggestions(query);
		
		console.log('[SmartQuickSwitcher] getSuggestions query:', `"${query}"`, '| matches:', suggestions.length, '| fallback enabled:', this.activeRule.fallbackToAll);
		
		// If no matches and fallback enabled and query is not empty, search all files
		if (suggestions.length === 0 && query.trim().length > 0 && this.activeRule.fallbackToAll && !this.usingFallback) {
			console.log('[SmartQuickSwitcher] No matches, triggering fallback to all files');
			this.usingFallback = true;
			
			// Get all files without property filter
			const allFiles = this.app.vault.getMarkdownFiles();
			const fuzzySearch = prepareFuzzySearch(query);
			const fallbackMatches: FuzzyMatch<TFile>[] = [];
			
			for (const file of allFiles) {
				const match = fuzzySearch(file.basename);
				if (match) {
					fallbackMatches.push({
						item: file,
						match: match
					});
				}
			}
			
			// Update map for fallback files
			this.fileToResultMap.clear();
			for (const file of allFiles) {
				this.fileToResultMap.set(file.path, {
					file,
					group: ResultGroup.OTHER,
					priority: 999
				});
			}
			
			console.log('[SmartQuickSwitcher] Fallback found', fallbackMatches.length, 'matches');
			return fallbackMatches.slice(0, this.maxSuggestions);
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
			case ResultGroup.OTHER:
				return null;  // No label for other files
			default:
				return null;
		}
	}
}
