import { TFile } from 'obsidian';
import { ResultGroup } from '../types';

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
 * Find and score non-filtered files that match the query
 * 
 * @param allFiles - All available files
 * @param excludePaths - Set of file paths to exclude (already in filtered results)
 * @param query - Search query string
 * @param fuzzySearchFn - Function to perform fuzzy search
 * @returns Array of non-filtered matches with NON_FILTERED group, sorted by score descending
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
