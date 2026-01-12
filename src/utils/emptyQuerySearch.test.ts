import { describe, it, expect } from 'vitest';
import {
	ResultGroup,
	categorizeAndPrioritize,
	sortByPriority
} from './searchUtils';

/**
 * Integration test to verify search works correctly with empty query
 * This simulates what the SearchEngine does when query is empty
 */
describe('Empty Query Search Integration', () => {
	it('should return all files grouped by priority when query is empty', () => {
		// Simulate all files in vault
		const allFiles = [
			'note1.md',
			'note2.md',
			'note3.md',
			'note4.md',
			'note5.md',
			'note6.md'
		];

		// Simulate recent files (LRU cache)
		const recentSet = new Set(['note1.md', 'note2.md']);

		// Simulate two-hop links from current file
		const twoHopSet = new Set(['note3.md']);

		// Simulate backlinks to current file
		const backlinkSet = new Set(['note4.md']);

		// Group configs
		const groupConfigs = {
			recentFiles: { enabled: true, priority: 1 },
			twoHopLinks: { enabled: true, priority: 2 },
			backlinks: { enabled: true, priority: 3 }
		};

		// Categorize files
		const categorized = categorizeAndPrioritize(
			allFiles,
			(file) => file,
			recentSet,
			twoHopSet,
			backlinkSet,
			groupConfigs
		);

		// Sort by priority
		const sorted = sortByPriority(categorized, (file) => file);

		// Verify results
		expect(sorted.length).toBe(6);

		// First two should be recent files (priority 1)
		expect(sorted[0].group).toBe(ResultGroup.RECENT);
		expect(sorted[1].group).toBe(ResultGroup.RECENT);
		expect([sorted[0].item, sorted[1].item].sort()).toEqual(['note1.md', 'note2.md']);

		// Next should be two-hop (priority 2)
		expect(sorted[2]).toEqual({
			item: 'note3.md',
			group: ResultGroup.TWO_HOP,
			priority: 2
		});

		// Next should be backlink (priority 3)
		expect(sorted[3]).toEqual({
			item: 'note4.md',
			group: ResultGroup.BACKLINK,
			priority: 3
		});

		// Last two should be other files (priority 999)
		expect(sorted[4].group).toBe(ResultGroup.OTHER);
		expect(sorted[5].group).toBe(ResultGroup.OTHER);
		expect([sorted[4].item, sorted[5].item].sort()).toEqual(['note5.md', 'note6.md']);
	});

	it('should handle empty query with no current file (all files are OTHER)', () => {
		const allFiles = ['note1.md', 'note2.md', 'note3.md'];

		// No current file means no grouping
		const categorized = categorizeAndPrioritize(
			allFiles,
			(file) => file,
			new Set(),
			new Set(),
			new Set(),
			{
				recentFiles: { enabled: true, priority: 1 },
				twoHopLinks: { enabled: true, priority: 2 },
				backlinks: { enabled: true, priority: 3 }
			}
		);

		const sorted = sortByPriority(categorized, (file) => file);

		// All should be OTHER group
		expect(sorted.every(r => r.group === ResultGroup.OTHER)).toBe(true);
		expect(sorted.every(r => r.priority === 999)).toBe(true);

		// Should be sorted alphabetically
		expect(sorted.map(r => r.item)).toEqual(['note1.md', 'note2.md', 'note3.md']);
	});

	it('should respect disabled groups in empty query', () => {
		const allFiles = ['recent.md', 'twohop.md', 'backlink.md', 'other.md'];

		const categorized = categorizeAndPrioritize(
			allFiles,
			(file) => file,
			new Set(['recent.md']),
			new Set(['twohop.md']),
			new Set(['backlink.md']),
			{
				recentFiles: { enabled: false, priority: 1 },  // DISABLED
				twoHopLinks: { enabled: true, priority: 2 },
				backlinks: { enabled: true, priority: 3 }
			}
		);

		const sorted = sortByPriority(categorized, (file) => file);

		// recent.md should be TWO_HOP (next enabled group)
		const recentFile = sorted.find(r => r.item === 'recent.md');
		expect(recentFile?.group).toBe(ResultGroup.OTHER);

		// twohop.md should be TWO_HOP
		const twoHopFile = sorted.find(r => r.item === 'twohop.md');
		expect(twoHopFile?.group).toBe(ResultGroup.TWO_HOP);

		// backlink.md should be BACKLINK
		const backlinkFile = sorted.find(r => r.item === 'backlink.md');
		expect(backlinkFile?.group).toBe(ResultGroup.BACKLINK);
	});

	it('should handle property-filtered results with empty query', () => {
		// After property filtering, only these files remain
		const filteredFiles = ['active1.md', 'active2.md', 'active3.md'];

		const categorized = categorizeAndPrioritize(
			filteredFiles,
			(file) => file,
			new Set(['active1.md']),  // active1 is recent
			new Set(['active2.md']),  // active2 is two-hop
			new Set(),
			{
				recentFiles: { enabled: true, priority: 1 },
				twoHopLinks: { enabled: true, priority: 2 },
				backlinks: { enabled: true, priority: 3 }
			}
		);

		const sorted = sortByPriority(categorized, (file) => file);

		expect(sorted[0]).toEqual({
			item: 'active1.md',
			group: ResultGroup.RECENT,
			priority: 1
		});

		expect(sorted[1]).toEqual({
			item: 'active2.md',
			group: ResultGroup.TWO_HOP,
			priority: 2
		});

		expect(sorted[2]).toEqual({
			item: 'active3.md',
			group: ResultGroup.OTHER,
			priority: 999
		});
	});
});
