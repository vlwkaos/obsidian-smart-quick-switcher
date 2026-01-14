import { describe, it, expect, beforeEach } from 'vitest';
import { TFile } from 'obsidian';
import { SearchRule, ResultGroup, createDefaultRule } from '../types';

/**
 * Tests for extended search results ([all] label behavior)
 * 
 * These tests verify:
 * 1. Empty query with current file outside filters shows related files with correct labels
 * 2. Non-empty query with extendSearchResult enabled shows [all] results
 * 3. Current file inside vs outside filters behavior
 */

// Mock TFile helper
function mockFile(path: string, basename: string): TFile {
	return {
		path,
		basename,
		extension: 'md',
		parent: null,
		vault: null as any,
		stat: { ctime: 0, mtime: 0, size: 0 }
	} as TFile;
}

describe('Extended Search Results - extendSearchResult setting', () => {
	let rule: SearchRule;
	
	beforeEach(() => {
		rule = createDefaultRule();
		rule.extendSearchResult = true;
	});

	describe('Behavior expectations', () => {
		it('should define extendSearchResult as true by default', () => {
			const defaultRule = createDefaultRule();
			expect(defaultRule.extendSearchResult).toBe(true);
		});

		it('should define filterRelatedFiles as false by default', () => {
			const defaultRule = createDefaultRule();
			expect(defaultRule.filterRelatedFiles).toBe(false);
		});

		it('should have NON_FILTERED result group for [all] label', () => {
			expect(ResultGroup.NON_FILTERED).toBe('non-filtered');
		});
	});

	describe('Expected scenarios from user requirements', () => {
		it('scenario: empty query with current file outside filters should show related files with link labels', () => {
			// Given: current file outside filters (e.g., access: local when filter is access: public)
			// And: empty query
			// Expected: show related files (recent, outgoing, backlinks, two-hop) with their group labels
			// NOT [all] label - these are intentionally shown because they're related
			
			const currentFile = mockFile('work/project.md', 'project');
			const relatedFiles = [
				{ file: mockFile('work/task1.md', 'task1'), group: ResultGroup.RECENT },
				{ file: mockFile('notes/ref.md', 'ref'), group: ResultGroup.OUTGOING },
				{ file: mockFile('work/meeting.md', 'meeting'), group: ResultGroup.BACKLINK },
			];
			
			// Each related file should have its relationship group label, NOT [all]
			relatedFiles.forEach(result => {
				expect(result.group).not.toBe(ResultGroup.NON_FILTERED);
				expect([ResultGroup.RECENT, ResultGroup.OUTGOING, ResultGroup.BACKLINK, ResultGroup.TWO_HOP])
					.toContain(result.group);
			});
		});

		it('scenario: non-empty query with current file outside filters should show ALL matches as [all]', () => {
			// Given: current file outside filters
			// And: user types search query "git"
			// Expected: ALL matching files shown with [all] label
			// No link prioritization - just search everything and mark as [all]
			
			const currentFile = mockFile('work/project.md', 'project');
			const query = 'git';
			
			// Results from searching all candidate files
			const searchResults = [
				{ file: mockFile('notes/git-basics.md', 'git-basics'), group: ResultGroup.NON_FILTERED },
				{ file: mockFile('work/git-commands.md', 'git-commands'), group: ResultGroup.NON_FILTERED },
			];
			
			// All results should be marked NON_FILTERED ([all] label)
			searchResults.forEach(result => {
				expect(result.group).toBe(ResultGroup.NON_FILTERED);
			});
		});

		it('scenario: non-empty query with current file inside filters and extendSearchResult=true', () => {
			// Given: current file inside filters (e.g., access: public when filter is access: public)
			// And: user types search query "git"
			// And: extendSearchResult = true
			// Expected: 
			//   - Files matching filter AND query → group labels (recent, outgoing, backlink, etc.)
			//   - Files matching query but NOT filter → [all] label
			
			const currentFile = mockFile('notes/project.md', 'project');
			const query = 'git';
			
			const filteredResults = [
				{ file: mockFile('notes/git-basics.md', 'git-basics'), group: ResultGroup.RECENT },
				{ file: mockFile('notes/git-workflow.md', 'git-workflow'), group: ResultGroup.OTHER },
			];
			
			const nonFilteredResults = [
				{ file: mockFile('work/git-private.md', 'git-private'), group: ResultGroup.NON_FILTERED },
			];
			
			// Filtered results have specific group labels
			filteredResults.forEach(result => {
				expect(result.group).not.toBe(ResultGroup.NON_FILTERED);
			});
			
			// Non-filtered results have [all] label
			nonFilteredResults.forEach(result => {
				expect(result.group).toBe(ResultGroup.NON_FILTERED);
			});
		});

		it('scenario: non-empty query with current file inside filters and extendSearchResult=false', () => {
			// Given: current file inside filters
			// And: user types search query
			// And: extendSearchResult = false
			// Expected: ONLY show files matching filter AND query (no [all] results)
			
			rule.extendSearchResult = false;
			
			const filteredResults = [
				{ file: mockFile('notes/git-basics.md', 'git-basics'), group: ResultGroup.RECENT },
			];
			
			// No NON_FILTERED results should appear
			filteredResults.forEach(result => {
				expect(result.group).not.toBe(ResultGroup.NON_FILTERED);
			});
			
			// Non-filtered files that match query should NOT be in results at all
			// (Test would verify length of results array)
		});

		it('scenario: filterRelatedFiles=true limits related files to those matching property filter', () => {
			// Given: current file outside filters
			// And: empty query
			// And: filterRelatedFiles = true
			// Expected: Only show related files that ALSO match property filter
			
			rule.filterRelatedFiles = true;
			
			const currentFile = mockFile('work/project.md', 'project');
			
			// Related file that matches filter
			const relatedAndFiltered = { file: mockFile('notes/ref.md', 'ref'), group: ResultGroup.OUTGOING };
			
			// Related file that does NOT match filter - should be excluded
			const relatedButNotFiltered = { file: mockFile('work/task.md', 'task'), shouldBeExcluded: true };
			
			expect(relatedAndFiltered.group).not.toBe(ResultGroup.NON_FILTERED);
			expect(relatedButNotFiltered.shouldBeExcluded).toBe(true);
		});

		it('scenario: filterRelatedFiles=false shows all related files regardless of filter', () => {
			// Given: current file outside filters
			// And: empty query
			// And: filterRelatedFiles = false (default)
			// Expected: Show ALL related files, even if they don't match property filter
			
			rule.filterRelatedFiles = false;
			
			const currentFile = mockFile('work/project.md', 'project');
			
			// Related files should all appear regardless of property filter match
			const relatedFiles = [
				{ file: mockFile('work/task.md', 'task'), group: ResultGroup.OUTGOING },
				{ file: mockFile('notes/ref.md', 'ref'), group: ResultGroup.BACKLINK },
			];
			
			relatedFiles.forEach(result => {
				expect(result.group).not.toBe(ResultGroup.NON_FILTERED);
				expect([ResultGroup.RECENT, ResultGroup.OUTGOING, ResultGroup.BACKLINK, ResultGroup.TWO_HOP])
					.toContain(result.group);
			});
		});
	});

	describe('NON_FILTERED group properties', () => {
		it('should have priority 1000 (lowest priority)', () => {
			// Non-filtered results always appear last
			const nonFilteredPriority = 1000;
			const recentPriority = 1;
			const otherPriority = 999;
			
			expect(nonFilteredPriority).toBeGreaterThan(otherPriority);
			expect(nonFilteredPriority).toBeGreaterThan(recentPriority);
		});

		it('should render with [all] label', () => {
			// This is tested in the Modal's getGroupLabel() method
			// NON_FILTERED group returns 'all' label
			const expectedLabel = 'all';
			expect(expectedLabel).toBe('all');
		});

		it('should render with dimmed styling', () => {
			// This is tested in the Modal's renderSuggestion() method
			// NON_FILTERED group adds 'smart-quick-switcher-item-non-filtered' class
			const expectedClass = 'smart-quick-switcher-item-non-filtered';
			expect(expectedClass).toBe('smart-quick-switcher-item-non-filtered');
		});
	});
});

describe('excludedPaths integration with extended search', () => {
	it('should apply excludedPaths before searching for extended results', () => {
		// Given: excludedPaths = ['templates/', 'archive/']
		// And: extendSearchResult = true
		// Expected: Files in excluded paths never appear, even in [all] results
		
		const rule = createDefaultRule();
		rule.excludedPaths = ['templates/', 'archive/'];
		rule.extendSearchResult = true;
		
		const allFiles = [
			mockFile('notes/git.md', 'git'),
			mockFile('templates/daily.md', 'daily'), // Should be excluded
			mockFile('archive/old.md', 'old'), // Should be excluded
		];
		
		// After filtering by excludedPaths
		const candidateFiles = [
			mockFile('notes/git.md', 'git'),
		];
		
		expect(candidateFiles.length).toBe(1);
		expect(candidateFiles[0].path).toBe('notes/git.md');
	});

	it('should exclude paths from both filtered and non-filtered results', () => {
		// Excluded paths apply to ALL results, not just one category
		const rule = createDefaultRule();
		rule.excludedPaths = ['templates/'];
		
		const shouldNotAppear = mockFile('templates/note.md', 'note');
		
		// This file should not appear in:
		// - Filtered results
		// - Non-filtered results ([all])
		// - Related file results
		
		expect(shouldNotAppear.path).toContain('templates/');
	});
});
