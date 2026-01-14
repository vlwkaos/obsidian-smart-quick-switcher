import { App, TFile, prepareFuzzySearch, SearchResult as ObsidianSearchResult } from 'obsidian';
import { SearchRule, SearchResult, ResultGroup } from './types';
import { LinkAnalyzer, CategorizedLinks } from './LinkAnalyzer';
import { PropertyFilterEngine } from './PropertyFilterEngine';
import { RecentFilesTracker } from './RecentFilesTracker';
import { filterByExcludedPaths, isPathExcluded } from './utils/pathFilterUtils';

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

		// Step 1: Apply excluded paths filter
		const candidateFiles = filterByExcludedPaths(allFiles, rule.excludedPaths);
		const afterExclude = candidateFiles.length;

		// Step 2: Determine if current file is outside all filters
		const currentFileOutsideFilters = currentFile && (
			isPathExcluded(currentFile.path, rule.excludedPaths) ||
			!this.propertyFilter.passesFilters(currentFile, rule.propertyFilters)
		);

		console.log('[SearchEngine] Total:', totalFiles, '| After exclude:', afterExclude, '| Query:', `"${query}"`, '| Current file outside filters:', currentFileOutsideFilters);

		// Empty query handling
		if (!query || query.trim().length === 0) {
			// NEW: If current file is outside filters, show related files (filtered first, then non-filtered with [all])
			if (currentFileOutsideFilters && currentFile) {
				console.log('[SearchEngine] Current file outside filters - showing related files with filter priority');
				return this.getRelatedFilesWithFilterPriority(candidateFiles, rule, currentFile);
			}

			// Existing: Apply property filters
			let filteredFiles = this.propertyFilter.filterFiles(candidateFiles, rule.propertyFilters);
			const filteredCount = filteredFiles.length;

			console.log('[SearchEngine] After property filter:', filteredCount);

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

		// Non-empty query handling
		if (currentFileOutsideFilters && currentFile) {
			// NEW: Current file outside filters - prioritize links, then filtered results
			return this.searchWithLinkPriority(query, rule, currentFile, candidateFiles);
		}

		// Existing: Normal search within filtered files
		let filteredFiles = this.propertyFilter.filterFiles(candidateFiles, rule.propertyFilters);
		const matchedFiles = this.searchByQuery(filteredFiles, query, rule);

		console.log('[SearchEngine] Matched files in filtered set:', matchedFiles.length);

		// Group and prioritize matched files
		let results = this.getGroupedResults(matchedFiles, rule, currentFile);

		// Extend with non-filtered results if enabled
		if (rule.extendSearchResult) {
			console.log('[SearchEngine] extendSearchResult enabled, searching non-filtered files');
			
			// Get all files that are NOT in the filtered set
			const filteredPaths = new Set(filteredFiles.map(f => f.path));
			const nonFilteredFiles = candidateFiles.filter(f => !filteredPaths.has(f.path));
			
			// Search within non-filtered files
			const nonFilteredMatches = this.searchByQuery(nonFilteredFiles, query, rule);
			
			// Add non-filtered matches with NON_FILTERED group and low priority
			const nonFilteredResults = nonFilteredMatches.map(file => ({
				file,
				group: ResultGroup.NON_FILTERED,
				priority: 1000
			}));
			
			console.log('[SearchEngine] Non-filtered results:', nonFilteredResults.length);
			
			// Append to results (handles both "has matches" and "no matches" cases)
			results = results.concat(nonFilteredResults);
		}

		return results;
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
	 * Get related files when current file is outside filters (empty query)
	 * Behavior depends on filterRelatedFiles setting:
	 * - true: Only show related files that match property filters
	 * - false: Show all related files (ignore property filters)
	 */
	private getRelatedFilesWithFilterPriority(
		candidateFiles: TFile[],
		rule: SearchRule,
		currentFile: TFile
	): SearchResult[] {
		// Get current file's link relationships
		const links = this.linkAnalyzer.getCategorizedLinks(currentFile);
		const recentSet = new Set(this.recentFiles.getRecentFiles());
		
		console.log('[SearchEngine] Link relationships - recent:', recentSet.size, 'outgoing:', links.outgoing.size, 'backlinks:', links.backlinks.size, 'two-hop:', links.twoHop.size);
		
		const relatedPaths = new Set([
			...recentSet,
			...links.outgoing,
			...links.backlinks,
			...links.twoHop
		]);
		
		// Filter to only related files from candidate files
		let relatedFiles = candidateFiles.filter(f => relatedPaths.has(f.path));
		
		console.log('[SearchEngine] Related files found:', relatedFiles.length, '| filterRelatedFiles:', rule.filterRelatedFiles);
		
		// Apply property filter if configured
		if (rule.filterRelatedFiles) {
			relatedFiles = relatedFiles.filter(f => 
				this.propertyFilter.passesFilters(f, rule.propertyFilters)
			);
			console.log('[SearchEngine] After property filter:', relatedFiles.length);
		}
		
		// Group by relationship type and return
		const results = this.getGroupedResults(relatedFiles, rule, currentFile);
		
		console.log('[SearchEngine] Grouped results:', results.map(r => `${r.file.basename}=[${r.group}]`).join(', '));
		
		return results;
	}

	/**
	 * Search with link priority when current file is outside filters
	 * Prioritizes: 1) Links to current file, 2) Filtered results, 3) Extended results (if enabled)
	 */
	private searchWithLinkPriority(
		query: string,
		rule: SearchRule,
		currentFile: TFile,
		candidateFiles: TFile[]
	): SearchResult[] {
		// 1. Get current file's link relationships
		const links = this.linkAnalyzer.getCategorizedLinks(currentFile);
		const recentSet = new Set(this.recentFiles.getRecentFiles());
		
		const linkedPaths = new Set([
			...links.outgoing,
			...links.backlinks,
			...links.twoHop
		]);
		
		// 2. Search within linked files and recent files
		const linkedFiles = candidateFiles.filter(f => 
			linkedPaths.has(f.path) || recentSet.has(f.path)
		);
		const linkedMatches = this.searchByQuery(linkedFiles, query, rule);
		const linkedResults = this.getGroupedResults(linkedMatches, rule, currentFile);
		
		console.log('[SearchEngine] Link-based matches:', linkedMatches.length);
		
		// 3. Search within filtered files (excluding already matched links)
		const matchedPaths = new Set(linkedMatches.map(f => f.path));
		const filteredFiles = this.propertyFilter.filterFiles(candidateFiles, rule.propertyFilters);
		const remainingFiltered = filteredFiles.filter(f => !matchedPaths.has(f.path));
		const filteredMatches = this.searchByQuery(remainingFiltered, query, rule);
		const filteredResults = filteredMatches.map(file => ({
			file,
			group: ResultGroup.OTHER,
			priority: 500  // After linked results
		}));
		
		console.log('[SearchEngine] Filtered matches:', filteredMatches.length);
		
		// 4. Combine results
		let results = [...linkedResults, ...filteredResults];
		
		// 5. Extend with non-filtered results if enabled
		if (rule.extendSearchResult) {
			console.log('[SearchEngine] extendSearchResult enabled for link priority search');
			
			// Get non-filtered files (excluding already matched)
			const allMatchedPaths = new Set([...matchedPaths, ...filteredMatches.map(f => f.path)]);
			const filteredPaths = new Set(filteredFiles.map(f => f.path));
			const nonFilteredFiles = candidateFiles.filter(f => 
				!allMatchedPaths.has(f.path) && !filteredPaths.has(f.path)
			);
			
			const nonFilteredMatches = this.searchByQuery(nonFilteredFiles, query, rule);
			const nonFilteredResults = nonFilteredMatches.map(file => ({
				file,
				group: ResultGroup.NON_FILTERED,
				priority: 1000
			}));
			
			console.log('[SearchEngine] Extended non-filtered matches:', nonFilteredMatches.length);
			results = results.concat(nonFilteredResults);
		}
		
		return results;
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

		console.log('[SearchEngine] getGroupedResults - recentSet:', [...recentSet].slice(0, 3), '| outgoing:', [...links.outgoing].slice(0, 3), '| backlinks:', [...links.backlinks].slice(0, 3));

		// Categorize and prioritize each file
		const results: SearchResult[] = filesWithoutCurrent.map(file => {
			let group: ResultGroup = ResultGroup.OTHER;
			let priority = 999;

			const inRecent = recentSet.has(file.path);
			const inOutgoing = links.outgoing.has(file.path);
			const inBacklinks = links.backlinks.has(file.path);
			const inTwoHop = links.twoHop.has(file.path);

			// Check group membership - order matters for priority!
			if (rule.recentFiles.enabled && inRecent) {
				group = ResultGroup.RECENT;
				priority = rule.recentFiles.priority;
			} else if (rule.outgoingLinks.enabled && inOutgoing) {
				group = ResultGroup.OUTGOING;
				priority = rule.outgoingLinks.priority;
			} else if (rule.backlinks.enabled && inBacklinks) {
				group = ResultGroup.BACKLINK;
				priority = rule.backlinks.priority;
			} else if (rule.twoHopLinks.enabled && inTwoHop) {
				group = ResultGroup.TWO_HOP;
				priority = rule.twoHopLinks.priority;
			}

			console.log('[SearchEngine] File:', file.path, '| inRecent:', inRecent, '| inOutgoing:', inOutgoing, '| inBacklinks:', inBacklinks, '| inTwoHop:', inTwoHop, '| group:', group);

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
