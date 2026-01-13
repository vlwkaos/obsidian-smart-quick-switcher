import { describe, it, expect } from 'vitest';
import { TFile } from 'obsidian';
import { ResultGroup } from '../types';
import {
	sortSuggestionsByPriorityAndScore,
	filesToSuggestionMatches,
	findNonFilteredMatches,
	combineSuggestions,
	getSortedSuggestionsWithNonFiltered,
	SuggestionMatch,
	FuzzySearchFn
} from './suggestionUtils';

// Mock TFile creator
function createMockFile(path: string, basename: string): TFile {
	return {
		path,
		basename,
		parent: { path: 'notes' }
	} as TFile;
}

// Mock fuzzy search function
const createMockFuzzySearch = (scores: Record<string, number>): FuzzySearchFn => {
	return (text: string) => {
		const score = scores[text];
		if (score !== undefined) {
			return { score, matches: [] };
		}
		return null;
	};
};

describe('sortSuggestionsByPriorityAndScore', () => {
	it('sorts by priority first (lower number = higher priority)', () => {
		const file1 = createMockFile('1.md', 'file1');
		const file2 = createMockFile('2.md', 'file2');
		const file3 = createMockFile('3.md', 'file3');
		
		const suggestions: SuggestionMatch[] = [
			{ file: file1, score: 100, group: ResultGroup.OTHER, priority: 999 },
			{ file: file2, score: 50, group: ResultGroup.RECENT, priority: 1 },
			{ file: file3, score: 80, group: ResultGroup.BACKLINK, priority: 3 }
		];
		
		const sorted = sortSuggestionsByPriorityAndScore(suggestions);
		
		expect(sorted[0].priority).toBe(1);  // RECENT first
		expect(sorted[1].priority).toBe(3);  // BACKLINK second
		expect(sorted[2].priority).toBe(999); // OTHER last
	});
	
	it('sorts by score within same priority group', () => {
		const file1 = createMockFile('1.md', 'file1');
		const file2 = createMockFile('2.md', 'file2');
		const file3 = createMockFile('3.md', 'file3');
		
		const suggestions: SuggestionMatch[] = [
			{ file: file1, score: 50, group: ResultGroup.RECENT, priority: 1 },
			{ file: file2, score: 100, group: ResultGroup.RECENT, priority: 1 },
			{ file: file3, score: 75, group: ResultGroup.RECENT, priority: 1 }
		];
		
		const sorted = sortSuggestionsByPriorityAndScore(suggestions);
		
		// All have same priority, so sorted by score descending
		expect(sorted[0].score).toBe(100);
		expect(sorted[1].score).toBe(75);
		expect(sorted[2].score).toBe(50);
	});
	
	it('does not mutate original array', () => {
		const file1 = createMockFile('1.md', 'file1');
		const file2 = createMockFile('2.md', 'file2');
		
		const suggestions: SuggestionMatch[] = [
			{ file: file1, score: 50, group: ResultGroup.OTHER, priority: 999 },
			{ file: file2, score: 100, group: ResultGroup.RECENT, priority: 1 }
		];
		
		const originalFirst = suggestions[0];
		const sorted = sortSuggestionsByPriorityAndScore(suggestions);
		
		expect(suggestions[0]).toBe(originalFirst); // Original unchanged
		expect(sorted[0].file).toBe(file2); // Sorted order is different
		expect(suggestions[0].file).toBe(file1); // Original still in same order
	});
	
	it('handles empty array', () => {
		const sorted = sortSuggestionsByPriorityAndScore([]);
		expect(sorted).toEqual([]);
	});
});

describe('filesToSuggestionMatches', () => {
	it('converts files to suggestion matches with scores', () => {
		const file1 = createMockFile('git-intro.md', 'git-intro');
		const file2 = createMockFile('react.md', 'react');
		
		const fileToResultMap = new Map([
			['git-intro.md', { file: file1, group: ResultGroup.RECENT, priority: 1 }],
			['react.md', { file: file2, group: ResultGroup.OTHER, priority: 999 }]
		]);
		
		const fuzzySearch = createMockFuzzySearch({
			'git-intro': 95,
			'react': 50
		});
		
		const matches = filesToSuggestionMatches(
			[file1, file2],
			'git',
			fileToResultMap,
			fuzzySearch
		);
		
		expect(matches.length).toBe(2);
		expect(matches[0].file).toBe(file1);
		expect(matches[0].score).toBe(95);
		expect(matches[0].group).toBe(ResultGroup.RECENT);
		expect(matches[0].priority).toBe(1);
	});
	
	it('excludes files with no fuzzy match', () => {
		const file1 = createMockFile('git-intro.md', 'git-intro');
		const file2 = createMockFile('react.md', 'react');
		
		const fileToResultMap = new Map([
			['git-intro.md', { file: file1, group: ResultGroup.RECENT, priority: 1 }]
		]);
		
		const fuzzySearch = createMockFuzzySearch({
			'git-intro': 95
			// 'react' has no match
		});
		
		const matches = filesToSuggestionMatches(
			[file1, file2],
			'git',
			fileToResultMap,
			fuzzySearch
		);
		
		expect(matches.length).toBe(1);
		expect(matches[0].file).toBe(file1);
	});
	
	it('uses default group/priority if file not in result map', () => {
		const file1 = createMockFile('test.md', 'test');
		
		const fileToResultMap = new Map(); // Empty map
		
		const fuzzySearch = createMockFuzzySearch({
			'test': 80
		});
		
		const matches = filesToSuggestionMatches(
			[file1],
			'test',
			fileToResultMap,
			fuzzySearch
		);
		
		expect(matches.length).toBe(1);
		expect(matches[0].group).toBe(ResultGroup.OTHER);
		expect(matches[0].priority).toBe(999);
	});
});

describe('findNonFilteredMatches', () => {
	it('finds files not in exclude set', () => {
		const file1 = createMockFile('filtered.md', 'filtered');
		const file2 = createMockFile('non-filtered.md', 'non-filtered');
		const file3 = createMockFile('also-non-filtered.md', 'also-non-filtered');
		
		const excludePaths = new Set(['filtered.md']);
		
		const fuzzySearch = createMockFuzzySearch({
			'filtered': 100,
			'non-filtered': 90,
			'also-non-filtered': 80
		});
		
		const matches = findNonFilteredMatches(
			[file1, file2, file3],
			excludePaths,
			'filter',
			fuzzySearch
		);
		
		expect(matches.length).toBe(2);
		expect(matches.find(m => m.file === file1)).toBeUndefined(); // Excluded
		expect(matches.find(m => m.file === file2)).toBeDefined();
		expect(matches.find(m => m.file === file3)).toBeDefined();
	});
	
	it('assigns NON_FILTERED group and priority 1000', () => {
		const file1 = createMockFile('test.md', 'test');
		
		const fuzzySearch = createMockFuzzySearch({ 'test': 85 });
		
		const matches = findNonFilteredMatches(
			[file1],
			new Set(),
			'test',
			fuzzySearch
		);
		
		expect(matches[0].group).toBe(ResultGroup.NON_FILTERED);
		expect(matches[0].priority).toBe(1000);
	});
	
	it('sorts results by score descending', () => {
		const file1 = createMockFile('test-low.md', 'test-low');
		const file2 = createMockFile('test-high.md', 'test-high');
		const file3 = createMockFile('test-mid.md', 'test-mid');
		
		const fuzzySearch = createMockFuzzySearch({
			'test-low': 30,
			'test-high': 95,
			'test-mid': 60
		});
		
		const matches = findNonFilteredMatches(
			[file1, file2, file3],
			new Set(),
			'test',
			fuzzySearch
		);
		
		expect(matches[0].score).toBe(95);
		expect(matches[1].score).toBe(60);
		expect(matches[2].score).toBe(30);
	});
	
	it('returns empty array when all files are excluded', () => {
		const file1 = createMockFile('test.md', 'test');
		
		const excludePaths = new Set(['test.md']);
		const fuzzySearch = createMockFuzzySearch({ 'test': 85 });
		
		const matches = findNonFilteredMatches(
			[file1],
			excludePaths,
			'test',
			fuzzySearch
		);
		
		expect(matches).toEqual([]);
	});
});

describe('combineSuggestions', () => {
	it('combines filtered and non-filtered suggestions', () => {
		const file1 = createMockFile('1.md', 'file1');
		const file2 = createMockFile('2.md', 'file2');
		
		const filtered: SuggestionMatch[] = [
			{ file: file1, score: 100, group: ResultGroup.RECENT, priority: 1 }
		];
		
		const nonFiltered: SuggestionMatch[] = [
			{ file: file2, score: 80, group: ResultGroup.NON_FILTERED, priority: 1000 }
		];
		
		const combined = combineSuggestions(filtered, nonFiltered, 10);
		
		expect(combined.length).toBe(2);
		expect(combined[0].file).toBe(file1);
		expect(combined[1].file).toBe(file2);
	});
	
	it('respects maxSuggestions limit', () => {
		const file1 = createMockFile('1.md', 'file1');
		const file2 = createMockFile('2.md', 'file2');
		const file3 = createMockFile('3.md', 'file3');
		
		const filtered: SuggestionMatch[] = [
			{ file: file1, score: 100, group: ResultGroup.RECENT, priority: 1 },
			{ file: file2, score: 90, group: ResultGroup.RECENT, priority: 1 }
		];
		
		const nonFiltered: SuggestionMatch[] = [
			{ file: file3, score: 80, group: ResultGroup.NON_FILTERED, priority: 1000 }
		];
		
		const combined = combineSuggestions(filtered, nonFiltered, 2);
		
		expect(combined.length).toBe(2);
		expect(combined[0].file).toBe(file1);
		expect(combined[1].file).toBe(file2);
		// file3 is cut off due to limit
	});
	
	it('handles empty arrays', () => {
		const combined = combineSuggestions([], [], 10);
		expect(combined).toEqual([]);
	});
});

describe('getSortedSuggestionsWithNonFiltered', () => {
	it('returns sorted filtered suggestions when showNonFiltered is false', () => {
		const file1 = createMockFile('git-intro.md', 'git-intro');
		const file2 = createMockFile('git-basics.md', 'git-basics');
		
		const fileToResultMap = new Map([
			['git-intro.md', { file: file1, group: ResultGroup.OTHER, priority: 999 }],
			['git-basics.md', { file: file2, group: ResultGroup.RECENT, priority: 1 }]
		]);
		
		const fuzzySearch = createMockFuzzySearch({
			'git-intro': 80,
			'git-basics': 90
		});
		
		const results = getSortedSuggestionsWithNonFiltered(
			[file1, file2],
			[file1, file2],
			'git',
			fileToResultMap,
			fuzzySearch,
			false, // showNonFiltered = false
			10
		);
		
		expect(results.length).toBe(2);
		// Should be sorted by priority first
		expect(results[0].group).toBe(ResultGroup.RECENT);
		expect(results[1].group).toBe(ResultGroup.OTHER);
	});
	
	it('includes non-filtered results when showNonFiltered is true', () => {
		const file1 = createMockFile('git-filtered.md', 'git-filtered');
		const file2 = createMockFile('git-non-filtered.md', 'git-non-filtered');
		
		const fileToResultMap = new Map([
			['git-filtered.md', { file: file1, group: ResultGroup.RECENT, priority: 1 }]
		]);
		
		const fuzzySearch = createMockFuzzySearch({
			'git-filtered': 95,
			'git-non-filtered': 85
		});
		
		const results = getSortedSuggestionsWithNonFiltered(
			[file1],
			[file1, file2],
			'git',
			fileToResultMap,
			fuzzySearch,
			true, // showNonFiltered = true
			10
		);
		
		expect(results.length).toBe(2);
		expect(results[0].group).toBe(ResultGroup.RECENT);
		expect(results[1].group).toBe(ResultGroup.NON_FILTERED);
	});
	
	it('does not include non-filtered when filtered results are empty', () => {
		const file1 = createMockFile('test.md', 'test');
		
		const fileToResultMap = new Map();
		
		const fuzzySearch = createMockFuzzySearch({
			'test': 85
		});
		
		const results = getSortedSuggestionsWithNonFiltered(
			[], // No filtered files
			[file1],
			'test',
			fileToResultMap,
			fuzzySearch,
			true,
			10
		);
		
		expect(results.length).toBe(0);
	});
	
	it('sorts results correctly: group priority first, then score', () => {
		const file1 = createMockFile('git-recent-low.md', 'git-recent-low');
		const file2 = createMockFile('git-recent-high.md', 'git-recent-high');
		const file3 = createMockFile('git-other.md', 'git-other');
		const file4 = createMockFile('git-non-filtered.md', 'git-non-filtered');
		
		const fileToResultMap = new Map([
			['git-recent-low.md', { file: file1, group: ResultGroup.RECENT, priority: 1 }],
			['git-recent-high.md', { file: file2, group: ResultGroup.RECENT, priority: 1 }],
			['git-other.md', { file: file3, group: ResultGroup.OTHER, priority: 999 }]
		]);
		
		const fuzzySearch = createMockFuzzySearch({
			'git-recent-low': 50,
			'git-recent-high': 95,
			'git-other': 100,
			'git-non-filtered': 80
		});
		
		const results = getSortedSuggestionsWithNonFiltered(
			[file1, file2, file3],
			[file1, file2, file3, file4],
			'git',
			fileToResultMap,
			fuzzySearch,
			true,
			10
		);
		
		expect(results.length).toBe(4);
		
		// Order should be:
		// 1. git-recent-high (priority 1, score 95)
		// 2. git-recent-low (priority 1, score 50)
		// 3. git-other (priority 999, score 100)
		// 4. git-non-filtered (priority 1000, score 80)
		
		expect(results[0].file.basename).toBe('git-recent-high');
		expect(results[1].file.basename).toBe('git-recent-low');
		expect(results[2].file.basename).toBe('git-other');
		expect(results[3].file.basename).toBe('git-non-filtered');
	});
	
	it('respects maxSuggestions limit', () => {
		const file1 = createMockFile('1.md', 'file1');
		const file2 = createMockFile('2.md', 'file2');
		const file3 = createMockFile('3.md', 'file3');
		
		const fileToResultMap = new Map([
			['1.md', { file: file1, group: ResultGroup.RECENT, priority: 1 }],
			['2.md', { file: file2, group: ResultGroup.RECENT, priority: 1 }]
		]);
		
		const fuzzySearch = createMockFuzzySearch({
			'file1': 100,
			'file2': 90,
			'file3': 80
		});
		
		const results = getSortedSuggestionsWithNonFiltered(
			[file1, file2],
			[file1, file2, file3],
			'file',
			fileToResultMap,
			fuzzySearch,
			true,
			2 // Max 2 suggestions
		);
		
		expect(results.length).toBe(2);
	});
});
