import { TFile } from 'obsidian';

export enum ModifierAction {
	OPEN_NORMAL = 'open-normal',
	CREATE_NOTE = 'create-note',
	OPEN_NEW_PANE = 'open-new-pane',
	OPEN_NEW_WINDOW = 'open-new-window'
}

export type PropertyFilterOperator = 'equals' | 'not-equals' | 'contains' | 'exists' | 'not-exists';

export interface PropertyFilter {
	propertyKey: string;
	operator: PropertyFilterOperator;
	value: string;  // Empty for exists/not-exists
}

export interface ResultGroupPriority {
	enabled: boolean;
	priority: number;  // 1 = highest, lower number = higher priority
	ignoreFilters?: boolean;  // Allow this group to bypass property filters (empty query only)
}

export interface SearchRule {
	id: string;
	name: string;
	
	// Filters
	excludedPaths: string[];         // Folder paths to exclude (e.g., ["templates/", "archive/"])
	propertyFilters: PropertyFilter[];
	
	// Search behavior
	fuzzySearch: boolean;
	searchInTags: boolean;
	searchInProperties: boolean;
	
	// Result group priorities
	recentFiles: ResultGroupPriority;
	outgoingLinks: ResultGroupPriority;
	backlinks: ResultGroupPriority;
	twoHopLinks: ResultGroupPriority;
	
	// Extended results
	extendSearchResult: boolean;     // Show additional matches outside filter (marked as [all]) during search
	filterRelatedFiles: boolean;     // Apply property filters to related files (empty query, current file outside filters)
}

export interface SmartQuickSwitcherSettings {
	rules: SearchRule[];
	workspaceRules: Record<string, string[]>;  // workspace name -> rule IDs
	maxSuggestions: number;
	showDirectory: boolean;
	maxRecentFiles: number;  // LRU cache size
	newNoteTemplate?: string;  // Optional path to template file for new notes
}

export enum ResultGroup {
	RECENT = 'recent',
	OUTGOING = 'outgoing',
	BACKLINK = 'backlink',
	TWO_HOP = 'two-hop',
	OTHER = 'other',
	NON_FILTERED = 'non-filtered'
}

// Which field a query matched against — drives the per-result badges in the modal
export enum MatchField {
	NAME = 'name',
	TAG = 'tag',
	PROPERTY = 'property'
}

// A single file's query match, carrying score + which fields matched (for badges)
export interface QueryMatch {
	file: TFile;
	score: number;
	matchedFields: MatchField[];
}

export interface SearchResult {
	file: TFile;
	group: ResultGroup;
	priority: number;
	matchedFields?: MatchField[];  // ^ set during query search; undefined for empty-query browse
	score?: number;                // ^ combined fuzzy score, used to order within a group
}

export const DEFAULT_SETTINGS: SmartQuickSwitcherSettings = {
	rules: [],
	workspaceRules: {},
	maxSuggestions: 50,
	showDirectory: true,
	maxRecentFiles: 4,
	newNoteTemplate: undefined,
};

export function createDefaultRule(): SearchRule {
	return {
		id: `rule-${Date.now()}`,
		name: 'New Rule',
		excludedPaths: [],
		propertyFilters: [],
		fuzzySearch: true,
		searchInTags: true,
		searchInProperties: false,
		recentFiles: { enabled: true, priority: 1, ignoreFilters: true },
		outgoingLinks: { enabled: true, priority: 2 },
		backlinks: { enabled: true, priority: 3 },
		twoHopLinks: { enabled: true, priority: 4 },
		extendSearchResult: true,
		filterRelatedFiles: false,
	};
}
