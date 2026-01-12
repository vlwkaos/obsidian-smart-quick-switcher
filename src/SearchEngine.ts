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
		const totalFiles = allFiles.length;

		// Apply property filters first
		let filteredFiles = this.propertyFilter.filterFiles(allFiles, rule.propertyFilters);
		const filteredCount = filteredFiles.length;

		console.log('[SearchEngine] Total files:', totalFiles, '| After property filter:', filteredCount, '| Query:', `"${query}"`);

		// If query is empty, return grouped results (with optional recent files bypass)
		if (!query || query.trim().length === 0) {
			// If recent files should ignore filters, add them to the filtered set
			if (rule.recentFiles.enabled && rule.recentFiles.ignoreFilters) {
				const recentTFiles = this.recentFiles.getRecentTFiles();
				const filteredPaths = new Set(filteredFiles.map(f => f.path));
				
				// Add recent files that aren't already in filtered set
				for (const recentFile of recentTFiles) {
					if (!filteredPaths.has(recentFile.path)) {
						filteredFiles.push(recentFile);
					}
				}
				
				console.log('[SearchEngine] Added', recentTFiles.filter(f => !filteredPaths.has(f.path)).length, 'recent files (ignoring filters)');
			}
			
			return this.getGroupedResults(filteredFiles, rule, currentFile);
		}

		// Query is not empty: search within property-filtered files only
		// (recent files don't get special treatment during search)
		const matchedFiles = this.searchByQuery(filteredFiles, query, rule);

		console.log('[SearchEngine] Matched files in filtered set:', matchedFiles.length);

		if (matchedFiles.length === 0 && rule.fallbackToAll) {
			// No results: fallback to searching all files
			console.log('[SearchEngine] No matches - triggering fallback to all files');
			const allFilesWithoutFilter = this.app.vault.getMarkdownFiles();
			const fallbackResults = this.searchByQuery(allFilesWithoutFilter, query, rule).map(file => ({
				file,
				group: ResultGroup.OTHER,
				priority: 999
			}));
			console.log('[SearchEngine] Fallback results:', fallbackResults.length);
			return fallbackResults;
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

		console.log('[SearchEngine] searchByQuery called with', files.length, 'files, query:', `"${query}"`);

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

		console.log('[SearchEngine] searchByQuery found', results.length, 'matches');
		if (results.length > 0 && results.length <= 5) {
			console.log('[SearchEngine] Sample results:', results.slice(0, 5).map(r => ({ name: r.file.basename, score: r.score })));
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

		// Filter out the current file
		const filesWithoutCurrent = files.filter(file => file.path !== currentFile.path);

		// Build group sets
		const recentSet = new Set(this.recentFiles.getRecentFiles());
		const links = this.linkAnalyzer.getCategorizedLinks(currentFile);

		// Categorize and prioritize each file
		const results: SearchResult[] = filesWithoutCurrent.map(file => {
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
