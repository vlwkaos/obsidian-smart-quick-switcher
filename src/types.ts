import { TFile } from 'obsidian';

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
	searchInContent: boolean;
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
}

export enum ResultGroup {
	RECENT = 'recent',
	OUTGOING = 'outgoing',
	BACKLINK = 'backlink',
	TWO_HOP = 'two-hop',
	OTHER = 'other',
	NON_FILTERED = 'non-filtered'
}

export interface SearchResult {
	file: TFile;
	group: ResultGroup;
	priority: number;
}

export const DEFAULT_SETTINGS: SmartQuickSwitcherSettings = {
	rules: [],
	workspaceRules: {},
	maxSuggestions: 50,
	showDirectory: true,
	maxRecentFiles: 4,
};

export function createDefaultRule(): SearchRule {
	return {
		id: `rule-${Date.now()}`,
		name: 'New Rule',
		excludedPaths: [],
		propertyFilters: [],
		fuzzySearch: true,
		searchInContent: false,
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
