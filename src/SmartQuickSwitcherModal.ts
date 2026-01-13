import { App, FuzzySuggestModal, TFile, FuzzyMatch, prepareFuzzySearch } from 'obsidian';
import { SearchRule, SearchResult, ResultGroup } from './types';
import { SearchEngine } from './SearchEngine';
import { 
	sortSuggestionsByPriorityAndScore, 
	findNonFilteredMatches, 
	SuggestionMatch 
} from './utils/suggestionUtils';

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
		
		// If query is empty, use parent's default behavior
		if (!query || query.trim().length === 0) {
			return super.getSuggestions(query);
		}
		
		// Query is not empty - we need to handle non-filtered results
		// First, get filtered suggestions from parent class
		const filteredSuggestions = super.getSuggestions(query);
		
		// Convert to SuggestionMatch format for sorting
		const filteredMatches: SuggestionMatch[] = filteredSuggestions.map(s => {
			const result = this.fileToResultMap.get(s.item.path);
			return {
				file: s.item,
				score: s.match.score,
				group: result?.group ?? ResultGroup.OTHER,
				priority: result?.priority ?? 999
			};
		});
		
		// Sort by priority first, then by score
		const sortedFiltered = sortSuggestionsByPriorityAndScore(filteredMatches);
		
		console.log('[SmartQuickSwitcher] getSuggestions query:', `"${query}"`, '| filtered matches:', sortedFiltered.length, '| showNonFiltered:', this.activeRule.showNonFiltered);
		
		// If fallback enabled and no matches, search all files
		if (sortedFiltered.length === 0 && this.activeRule.fallbackToAll && !this.usingFallback) {
			console.log('[SmartQuickSwitcher] No matches, triggering fallback to all files');
			this.usingFallback = true;
			
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
		
		// If showNonFiltered is enabled and we have filtered matches, add non-filtered matches
		if (this.activeRule.showNonFiltered && sortedFiltered.length > 0) {
			console.log('[SmartQuickSwitcher] Adding non-filtered results');
			
			// Get all files and find non-filtered matches
			const allFiles = this.app.vault.getMarkdownFiles();
			const filteredPaths = new Set(sortedFiltered.map(m => m.file.path));
			const fuzzySearch = prepareFuzzySearch(query);
			
			const nonFilteredMatches = findNonFilteredMatches(
				allFiles,
				filteredPaths,
				query,
				fuzzySearch
			);
			
			// Update fileToResultMap for non-filtered files (needed for rendering)
			for (const match of nonFilteredMatches) {
				this.fileToResultMap.set(match.file.path, {
					file: match.file,
					group: match.group,
					priority: match.priority
				});
			}
			
			console.log('[SmartQuickSwitcher] Non-filtered matches:', nonFilteredMatches.length);
			
			// Combine and convert back to FuzzyMatch format
			const allMatches = sortedFiltered.concat(nonFilteredMatches);
			const combined: FuzzyMatch<TFile>[] = allMatches.slice(0, this.maxSuggestions).map(m => ({
				item: m.file,
				match: { score: m.score, matches: [] }
			}));
			
			return combined;
		}
		
		// Convert sorted filtered back to FuzzyMatch format
		const result: FuzzyMatch<TFile>[] = sortedFiltered.map(m => ({
			item: m.file,
			match: { score: m.score, matches: [] }
		}));
		
		return result;
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
