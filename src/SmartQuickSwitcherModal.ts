import { App, FuzzySuggestModal, TFile, FuzzyMatch, prepareFuzzySearch, normalizePath } from 'obsidian';
import { SearchRule, SearchResult, ResultGroup } from './types';
import { SearchEngine } from './SearchEngine';
import { findNonFilteredMatches } from './utils/suggestionUtils';
import { filterByExcludedPaths } from './utils/pathFilterUtils';
import { getSupportedFiles } from './utils/fileUtils';
import { getModifierAction, extractModifiers, ModifierAction } from './utils/modifierKeyUtils';

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
	private currentSuggestions: FuzzyMatch<TFile>[] = [];

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
		
		// Initialize with default footer
		this.setInstructions([
			{ command: "↵", purpose: "to open" }
		]);
		
		// Register keyboard event handler for Shift+Enter to create new notes
		this.scope.register(['Shift'], 'Enter', (evt: KeyboardEvent) => {
			console.log('[SmartQuickSwitcher] Shift+Enter handler triggered', {
				hasSuggestions: this.currentSuggestions.length,
				query: this.lastQuery
			});
			
			// Only create note if no suggestions exist
			if (this.currentSuggestions.length === 0) {
				evt.preventDefault();
				if (this.lastQuery && this.lastQuery.trim().length > 0) {
					console.log('[SmartQuickSwitcher] Creating note:', this.lastQuery);
					this.createNewNote(this.lastQuery);
					this.close();
				}
				return false;
			}
			// If there are suggestions, let default handler open the selected file
		});
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
			this.currentSuggestions = suggestions;
			this.updateInstructions(suggestions.length > 0, false);
			return suggestions;
		}
		
		// If extendSearchResult enabled, also search ALL candidate files and append [all] results
		if (this.activeRule.extendSearchResult) {
			console.log('[SmartQuickSwitcher] Searching all candidate files for extended results');
			
			const allFiles = getSupportedFiles(this.app);
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
			const finalSuggestions = [...suggestions, ...extendedMatches].slice(0, this.maxSuggestions);
			this.currentSuggestions = finalSuggestions;
			this.updateInstructions(finalSuggestions.length > 0, true);
			return finalSuggestions;
		}
		
		this.currentSuggestions = suggestions;
		this.updateInstructions(suggestions.length > 0, true);
		return suggestions;
	}
	
	/**
	 * Update footer instructions based on current state
	 */
	private updateInstructions(hasMatches: boolean, hasQuery: boolean): void {
		if (!hasQuery) {
			// Empty query: show open hint
			this.setInstructions([
				{ command: "↵", purpose: "to open" }
			]);
		} else if (hasMatches) {
			// Has matches: show open hint only
			this.setInstructions([
				{ command: "↵", purpose: "to open" }
			]);
		} else {
			// No matches: show create hint only
			this.setInstructions([
				{ command: "shift ↵", purpose: "to create" }
			]);
		}
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

	onChooseSuggestion(item: FuzzyMatch<TFile> | null, evt: MouseEvent | KeyboardEvent): void {
		const modifiers = extractModifiers(evt);
		const file = item?.item ?? null;
		const hasSelection = file !== null;
		const action = getModifierAction(modifiers, hasSelection);
		
		console.log('[SmartQuickSwitcher] onChooseSuggestion called:', {
			hasSelection,
			modifiers,
			action,
			query: this.lastQuery
		});
		
		switch (action) {
			case ModifierAction.CREATE_NOTE:
				// Only reached if no selection and shift pressed
				if (!this.lastQuery || this.lastQuery.trim().length === 0) {
					console.log('[SmartQuickSwitcher] Empty query, not creating note');
					return;
				}
				console.log('[SmartQuickSwitcher] Creating new note:', this.lastQuery);
				// Create note asynchronously (don't await to avoid blocking modal close)
				this.createNewNote(this.lastQuery);
				break;
				
			case ModifierAction.OPEN_NORMAL:
			default:
				if (file) {
					console.log('[SmartQuickSwitcher] Opening file:', file.path);
					this.app.workspace.getLeaf().openFile(file);
				}
				// If no file and no shift: do nothing
				break;
		}
	}
	
	onChooseItem(file: TFile, evt: MouseEvent | KeyboardEvent): void {
		// This is called by the parent class but we handle everything in onChooseSuggestion
		// Keep this as a no-op since onChooseSuggestion handles the logic
	}
	
	/**
	 * Create a new note with the given filename
	 * Respects Obsidian's "Default location for new notes" setting
	 * Handles duplicate filenames by opening existing file
	 */
	private async createNewNote(fileName: string): Promise<void> {
		// Sanitize filename (remove invalid characters)
		const sanitized = fileName.replace(/[\\/:*?"<>|]/g, '');
		if (!sanitized || sanitized.trim().length === 0) {
			return; // Don't create note with empty name
		}
		
		// Get default folder (respects user's Obsidian settings)
		const currentFile = this.app.workspace.getActiveFile();
		const folder = this.app.fileManager.getNewFileParent(
			currentFile?.path || ""
		);
		
		// Construct path
		const path = normalizePath(`${folder.path}/${sanitized}.md`);
		
		// Check if file already exists
		const existingFile = this.app.vault.getAbstractFileByPath(path);
		if (existingFile && existingFile instanceof TFile) {
			// Open existing file instead of creating duplicate
			await this.app.workspace.getLeaf().openFile(existingFile);
			return;
		}
		
		// Get template content (if configured)
		const content = await this.getTemplateContent();
		
		// Create the file
		const newFile = await this.app.vault.create(path, content);
		
		// Open the new file
		await this.app.workspace.getLeaf().openFile(newFile);
	}
	
	/**
	 * Get template content for new notes (if template configured)
	 * Returns empty string if no template set
	 * Performs basic template variable replacement
	 */
	private async getTemplateContent(): Promise<string> {
		// Access plugin settings via app
		const plugin = (this.app as any).plugins?.plugins['obsidian-smart-quick-switcher'];
		const templatePath = plugin?.settings?.newNoteTemplate;
		
		if (!templatePath) {
			return '';  // No template configured
		}
		
		const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
		if (!templateFile || !(templateFile instanceof TFile)) {
			console.warn('[SmartQuickSwitcher] Template not found:', templatePath);
			return '';  // Template file not found
		}
		
		try {
			let content = await this.app.vault.read(templateFile);
			
			// Perform template variable replacement
			content = this.basicTemplateReplacement(content);
			
			return content;
		} catch (error) {
			console.error('[SmartQuickSwitcher] Failed to read template:', error);
			return '';
		}
	}
	
	/**
	 * Template variable replacement supporting common Obsidian template variables
	 */
	private basicTemplateReplacement(content: string): string {
		const now = new Date();
		const title = this.lastQuery.trim();
		
		// Date components
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const hours = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');
		const seconds = String(now.getSeconds()).padStart(2, '0');
		
		// Common formats
		const date = `${year}-${month}-${day}`;
		const time = `${hours}:${minutes}:${seconds}`;
		const datetime = `${date}:${time}`;
		
		// Replace template variables (case-insensitive)
		const replacements: Record<string, string> = {
			// Title
			'{{title}}': title,
			
			// Date/Time combinations
			'{{date}}': date,
			'{{time}}': time,
			'{{datetime}}': datetime,
			
			// Individual components
			'{{year}}': String(year),
			'{{month}}': month,
			'{{day}}': day,
			'{{hour}}': hours,
			'{{minute}}': minutes,
			'{{second}}': seconds,
			
			// Common format variations
			'{{date:YYYY-MM-DD}}': date,
			'{{time:HH:mm:ss}}': time,
			'{{date:YYYY}}': String(year),
			'{{date:MM}}': month,
			'{{date:DD}}': day,
		};
		
		// Perform all replacements
		for (const [pattern, replacement] of Object.entries(replacements)) {
			// Case-insensitive replacement
			const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
			content = content.replace(regex, replacement);
		}
		
		return content;
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
