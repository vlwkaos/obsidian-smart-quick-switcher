import { TFile } from 'obsidian';
import { SearchResult, ResultGroup } from '../types';

/**
 * Represents a file match with score and group info
 */
export interface SuggestionMatch {
	file: TFile;
	score: number;
	group: ResultGroup;
	priority: number;
}

/**
 * Fuzzy search function type (matches Obsidian's prepareFuzzySearch return)
 */
export type FuzzySearchFn = (text: string) => { score: number; matches: readonly [number, number][] } | null;

/**
 * Sort suggestions by group priority first, then by match score within each group
 * 
 * @param suggestions - Array of suggestion matches to sort
 * @returns Sorted array (does not mutate input)
 */
export function sortSuggestionsByPriorityAndScore(suggestions: SuggestionMatch[]): SuggestionMatch[] {
	const sorted = [...suggestions];
	
	sorted.sort((a, b) => {
		// First sort by group priority (lower number = higher priority)
		if (a.priority !== b.priority) {
			return a.priority - b.priority;
		}
		
		// Within same group, sort by match score (higher score = better match)
		return b.score - a.score;
	});
	
	return sorted;
}

/**
 * Convert file list with result map into suggestion matches with scores
 * 
 * @param files - Files to convert
 * @param query - Search query string
 * @param fileToResultMap - Map of file paths to their SearchResult
 * @param fuzzySearchFn - Function to perform fuzzy search and get score
 * @returns Array of suggestion matches
 */
export function filesToSuggestionMatches(
	files: TFile[],
	query: string,
	fileToResultMap: Map<string, SearchResult>,
	fuzzySearchFn: FuzzySearchFn
): SuggestionMatch[] {
	const matches: SuggestionMatch[] = [];
	
	for (const file of files) {
		const matchResult = fuzzySearchFn(file.basename);
		if (matchResult) {
			const searchResult = fileToResultMap.get(file.path);
			matches.push({
				file,
				score: matchResult.score,
				group: searchResult?.group ?? ResultGroup.OTHER,
				priority: searchResult?.priority ?? 999
			});
		}
	}
	
	return matches;
}

/**
 * Find and score non-filtered files that match the query
 * 
 * @param allFiles - All available files
 * @param excludePaths - Set of file paths to exclude (already in filtered results)
 * @param query - Search query string
 * @param fuzzySearchFn - Function to perform fuzzy search
 * @returns Array of non-filtered matches with NON_FILTERED group
 */
export function findNonFilteredMatches(
	allFiles: TFile[],
	excludePaths: Set<string>,
	query: string,
	fuzzySearchFn: FuzzySearchFn
): SuggestionMatch[] {
	const matches: SuggestionMatch[] = [];
	
	for (const file of allFiles) {
		// Skip files already in filtered results
		if (excludePaths.has(file.path)) {
			continue;
		}
		
		const matchResult = fuzzySearchFn(file.basename);
		if (matchResult) {
			matches.push({
				file,
				score: matchResult.score,
				group: ResultGroup.NON_FILTERED,
				priority: 1000  // Non-filtered files have lowest priority
			});
		}
	}
	
	// Sort by score (descending) within the non-filtered group
	matches.sort((a, b) => b.score - a.score);
	
	return matches;
}

/**
 * Combine filtered and non-filtered suggestions with proper sorting and limits
 * 
 * @param filteredMatches - Matches from filtered files
 * @param nonFilteredMatches - Matches from non-filtered files
 * @param maxSuggestions - Maximum number of suggestions to return
 * @returns Combined and limited array of suggestions
 */
export function combineSuggestions(
	filteredMatches: SuggestionMatch[],
	nonFilteredMatches: SuggestionMatch[],
	maxSuggestions: number
): SuggestionMatch[] {
	// Combine all matches
	const combined = filteredMatches.concat(nonFilteredMatches);
	
	// Apply limit
	return combined.slice(0, maxSuggestions);
}

/**
 * Main function: Get sorted suggestions with optional non-filtered results
 * 
 * @param filteredFiles - Files that passed property filters
 * @param allFiles - All available files in vault
 * @param query - Search query string
 * @param fileToResultMap - Map of file paths to their SearchResult (for group/priority)
 * @param fuzzySearchFn - Function to perform fuzzy search
 * @param showNonFiltered - Whether to include non-filtered matches
 * @param maxSuggestions - Maximum number of suggestions to return
 * @returns Sorted array of suggestion matches
 */
export function getSortedSuggestionsWithNonFiltered(
	filteredFiles: TFile[],
	allFiles: TFile[],
	query: string,
	fileToResultMap: Map<string, SearchResult>,
	fuzzySearchFn: FuzzySearchFn,
	showNonFiltered: boolean,
	maxSuggestions: number
): SuggestionMatch[] {
	// Get filtered matches with scores
	const filteredMatches = filesToSuggestionMatches(
		filteredFiles,
		query,
		fileToResultMap,
		fuzzySearchFn
	);
	
	// Sort filtered matches by priority and score
	const sortedFiltered = sortSuggestionsByPriorityAndScore(filteredMatches);
	
	// If showNonFiltered is disabled or no filtered matches, return early
	if (!showNonFiltered || sortedFiltered.length === 0) {
		return sortedFiltered.slice(0, maxSuggestions);
	}
	
	// Find non-filtered matches
	const filteredPaths = new Set(filteredFiles.map(f => f.path));
	const nonFilteredMatches = findNonFilteredMatches(
		allFiles,
		filteredPaths,
		query,
		fuzzySearchFn
	);
	
	// Combine and limit
	return combineSuggestions(sortedFiltered, nonFilteredMatches, maxSuggestions);
}
