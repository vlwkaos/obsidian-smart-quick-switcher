import { describe, it, expect } from 'vitest';
import { TFile } from 'obsidian';
import { ResultGroup } from '../types';
import {
	findNonFilteredMatches,
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
	
	it('returns empty array when no files match query', () => {
		const file1 = createMockFile('test.md', 'test');
		
		const fuzzySearch = createMockFuzzySearch({
			// No matches for 'test'
		});
		
		const matches = findNonFilteredMatches(
			[file1],
			new Set(),
			'nomatch',
			fuzzySearch
		);
		
		expect(matches).toEqual([]);
	});
	
	it('handles empty file list', () => {
		const fuzzySearch = createMockFuzzySearch({});
		
		const matches = findNonFilteredMatches(
			[],
			new Set(),
			'test',
			fuzzySearch
		);
		
		expect(matches).toEqual([]);
	});
});
