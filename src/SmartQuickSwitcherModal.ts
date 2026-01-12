import { App, FuzzySuggestModal, TFile, prepareSimpleSearch } from 'obsidian';
import { SearchRule, SearchResult, ResultGroup } from './types';
import { SearchEngine } from './SearchEngine';

/**
 * Modal for smart quick switcher file switching
 */
export class SmartQuickSwitcherModal extends FuzzySuggestModal<SearchResult> {
	private searchEngine: SearchEngine;
	private activeRule: SearchRule;
	private showDirectory: boolean;
	private maxSuggestions: number;

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

		this.setPlaceholder('Search files...');
		this.limit = maxSuggestions;
	}

	getItems(): SearchResult[] {
		// Get all results with empty query - FuzzySuggestModal will filter as user types
		const currentFile = this.app.workspace.getActiveFile();
		const results = this.searchEngine.search('', this.activeRule, currentFile);
		
		console.log('[SmartQuickSwitcher] getItems() called, returning', results.length, 'results');
		console.log('[SmartQuickSwitcher] First few results:', results.slice(0, 5).map(r => ({
			name: r.file.basename,
			group: r.group,
			priority: r.priority
		})));
		
		return results;
	}

	getItemText(result: SearchResult): string {
		return result.file.basename;
	}

	renderSuggestion(match: any, el: HTMLElement): void {
		const result = match.item as SearchResult;
		el.addClass('smart-quick-switcher-item');

		// Add group label
		const label = this.getGroupLabel(result.group);
		if (label) {
			const labelEl = el.createSpan({ cls: 'smart-quick-switcher-label' });
			labelEl.setText(`[${label}]`);
		}

		// Add file name
		const nameEl = el.createSpan();
		nameEl.setText(result.file.basename);

		// Add directory path if enabled
		if (this.showDirectory && result.file.parent) {
			const pathEl = el.createSpan({ cls: 'smart-quick-switcher-path' });
			pathEl.setText(result.file.parent.path);
		}
	}

	onChooseItem(result: SearchResult, evt: MouseEvent | KeyboardEvent): void {
		// Open the selected file
		this.app.workspace.getLeaf().openFile(result.file);
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
