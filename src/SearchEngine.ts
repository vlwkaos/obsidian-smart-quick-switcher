import { App, TFile, prepareFuzzySearch, SearchResult as ObsidianSearchResult } from 'obsidian';
import { SearchRule, SearchResult, ResultGroup } from './types';
import { LinkAnalyzer, CategorizedLinks } from './LinkAnalyzer';
import { PropertyFilterEngine } from './PropertyFilterEngine';
import { RecentFilesTracker } from './RecentFilesTracker';

/**
 * Core search engine that orchestrates filtering, searching, and prioritization
 */
export class SearchEngine {
	private app: App;
	private linkAnalyzer: LinkAnalyzer;
	private propertyFilter: PropertyFilterEngine;
	private recentFiles: RecentFilesTracker;

	constructor(
		app: App,
		linkAnalyzer: LinkAnalyzer,
		propertyFilter: PropertyFilterEngine,
		recentFiles: RecentFilesTracker
	) {
		this.app = app;
		this.linkAnalyzer = linkAnalyzer;
		this.propertyFilter = propertyFilter;
		this.recentFiles = recentFiles;
	}

	/**
	 * Search files based on query and rule
	 */
	public search(query: string, rule: SearchRule, currentFile: TFile | null): SearchResult[] {
		// Get all markdown files
		let allFiles = this.app.vault.getMarkdownFiles();

		// Apply property filters first
		allFiles = this.propertyFilter.filterFiles(allFiles, rule.propertyFilters);

		// If query is empty, return grouped results
		if (!query || query.trim().length === 0) {
			return this.getGroupedResults(allFiles, rule, currentFile);
		}

		// Query is not empty: search and filter
		const matchedFiles = this.searchByQuery(allFiles, query, rule);

		if (matchedFiles.length === 0 && rule.fallbackToAll) {
			// No results: fallback to searching all files
			const allFilesWithoutFilter = this.app.vault.getMarkdownFiles();
			return this.searchByQuery(allFilesWithoutFilter, query, rule).map(file => ({
				file,
				group: ResultGroup.OTHER,
				priority: 999
			}));
		}

		// Group and prioritize matched files
		return this.getGroupedResults(matchedFiles, rule, currentFile);
	}

	/**
	 * Search files by query string
	 */
	private searchByQuery(files: TFile[], query: string, rule: SearchRule): TFile[] {
		const fuzzySearch = prepareFuzzySearch(query);
		const results: Array<{ file: TFile; score: number }> = [];

		for (const file of files) {
			let score = 0;

			// Search in file name
			const nameResult = fuzzySearch(file.basename);
			if (nameResult) {
				score += nameResult.score;
			}

			// Search in tags (if enabled)
			if (rule.searchInTags) {
				const cache = this.app.metadataCache.getFileCache(file);
				const tags = cache?.tags?.map(t => t.tag) || [];
				for (const tag of tags) {
					const tagResult = fuzzySearch(tag);
					if (tagResult) {
						score += tagResult.score * 0.5; // Lower weight for tags
					}
				}
			}

			// Search in properties (if enabled)
			if (rule.searchInProperties) {
				const cache = this.app.metadataCache.getFileCache(file);
				const frontmatter = cache?.frontmatter;
				if (frontmatter) {
					for (const [key, value] of Object.entries(frontmatter)) {
						const propStr = `${key}:${String(value)}`;
						const propResult = fuzzySearch(propStr);
						if (propResult) {
							score += propResult.score * 0.3; // Lower weight for properties
						}
					}
				}
			}

			if (score > 0) {
				results.push({ file, score });
			}
		}

		// Sort by score (descending)
		results.sort((a, b) => b.score - a.score);
		return results.map(r => r.file);
	}

	/**
	 * Group files by their category and assign priorities
	 */
	private getGroupedResults(files: TFile[], rule: SearchRule, currentFile: TFile | null): SearchResult[] {
		if (!currentFile) {
			// No current file: all files are "other"
			return files.map(file => ({
				file,
				group: ResultGroup.OTHER,
				priority: 999
			}));
		}

		// Build group sets
		const recentSet = new Set(this.recentFiles.getRecentFiles());
		const links = this.linkAnalyzer.getCategorizedLinks(currentFile);

		// Categorize and prioritize each file
		const results: SearchResult[] = files.map(file => {
			let group: ResultGroup = ResultGroup.OTHER;
			let priority = 999;

			// Check group membership - order matters for priority!
			if (rule.recentFiles.enabled && recentSet.has(file.path)) {
				group = ResultGroup.RECENT;
				priority = rule.recentFiles.priority;
			} else if (rule.outgoingLinks.enabled && links.outgoing.has(file.path)) {
				group = ResultGroup.OUTGOING;
				priority = rule.outgoingLinks.priority;
			} else if (rule.backlinks.enabled && links.backlinks.has(file.path)) {
				group = ResultGroup.BACKLINK;
				priority = rule.backlinks.priority;
			} else if (rule.twoHopLinks.enabled && links.twoHop.has(file.path)) {
				group = ResultGroup.TWO_HOP;
				priority = rule.twoHopLinks.priority;
			}

			return { file, group, priority };
		});

		// Sort by priority (lower number = higher priority)
		results.sort((a, b) => {
			if (a.priority !== b.priority) {
				return a.priority - b.priority;
			}
			// Same priority: sort alphabetically
			return a.file.basename.localeCompare(b.file.basename);
		});

		return results;
	}
}
