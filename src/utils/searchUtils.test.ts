import { describe, it, expect } from 'vitest';
import {
	ResultGroup,
	categorizeAndPrioritize,
	sortByPriority,
	filterByGroups,
	getItemsByGroup,
	countByGroup
} from './searchUtils';

describe('categorizeAndPrioritize', () => {
	it('should assign RECENT group to items in recent set', () => {
		const items = ['file1.md', 'file2.md', 'file3.md'];
		const recentSet = new Set(['file1.md']);
		const twoHopSet = new Set<string>();
		const backlinkSet = new Set<string>();
		const configs = {
			recentFiles: { enabled: true, priority: 1 },
			twoHopLinks: { enabled: true, priority: 2 },
			backlinks: { enabled: true, priority: 3 }
		};

		const results = categorizeAndPrioritize(
			items,
			(item) => item,
			recentSet,
			twoHopSet,
			backlinkSet,
			configs
		);

		expect(results[0]).toEqual({
			item: 'file1.md',
			group: ResultGroup.RECENT,
			priority: 1
		});
	});

	it('should assign TWO_HOP group when not in recent', () => {
		const items = ['file1.md', 'file2.md'];
		const recentSet = new Set<string>();
		const twoHopSet = new Set(['file1.md']);
		const backlinkSet = new Set<string>();
		const configs = {
			recentFiles: { enabled: true, priority: 1 },
			twoHopLinks: { enabled: true, priority: 2 },
			backlinks: { enabled: true, priority: 3 }
		};

		const results = categorizeAndPrioritize(
			items,
			(item) => item,
			recentSet,
			twoHopSet,
			backlinkSet,
			configs
		);

		expect(results[0]).toEqual({
			item: 'file1.md',
			group: ResultGroup.TWO_HOP,
			priority: 2
		});
	});

	it('should assign BACKLINK group when not in recent or two-hop', () => {
		const items = ['file1.md'];
		const recentSet = new Set<string>();
		const twoHopSet = new Set<string>();
		const backlinkSet = new Set(['file1.md']);
		const configs = {
			recentFiles: { enabled: true, priority: 1 },
			twoHopLinks: { enabled: true, priority: 2 },
			backlinks: { enabled: true, priority: 3 }
		};

		const results = categorizeAndPrioritize(
			items,
			(item) => item,
			recentSet,
			twoHopSet,
			backlinkSet,
			configs
		);

		expect(results[0]).toEqual({
			item: 'file1.md',
			group: ResultGroup.BACKLINK,
			priority: 3
		});
	});

	it('should assign OTHER group when not in any set', () => {
		const items = ['file1.md'];
		const recentSet = new Set<string>();
		const twoHopSet = new Set<string>();
		const backlinkSet = new Set<string>();
		const configs = {
			recentFiles: { enabled: true, priority: 1 },
			twoHopLinks: { enabled: true, priority: 2 },
			backlinks: { enabled: true, priority: 3 }
		};

		const results = categorizeAndPrioritize(
			items,
			(item) => item,
			recentSet,
			twoHopSet,
			backlinkSet,
			configs
		);

		expect(results[0]).toEqual({
			item: 'file1.md',
			group: ResultGroup.OTHER,
			priority: 999
		});
	});

	it('should respect precedence: recent > two-hop > backlink', () => {
		const items = ['file1.md'];
		// File is in all three sets
		const recentSet = new Set(['file1.md']);
		const twoHopSet = new Set(['file1.md']);
		const backlinkSet = new Set(['file1.md']);
		const configs = {
			recentFiles: { enabled: true, priority: 1 },
			twoHopLinks: { enabled: true, priority: 2 },
			backlinks: { enabled: true, priority: 3 }
		};

		const results = categorizeAndPrioritize(
			items,
			(item) => item,
			recentSet,
			twoHopSet,
			backlinkSet,
			configs
		);

		// Should be categorized as RECENT (highest precedence)
		expect(results[0].group).toBe(ResultGroup.RECENT);
		expect(results[0].priority).toBe(1);
	});

	it('should skip disabled groups', () => {
		const items = ['file1.md'];
		const recentSet = new Set(['file1.md']);
		const twoHopSet = new Set(['file1.md']);
		const backlinkSet = new Set(['file1.md']);
		const configs = {
			recentFiles: { enabled: false, priority: 1 },
			twoHopLinks: { enabled: true, priority: 2 },
			backlinks: { enabled: true, priority: 3 }
		};

		const results = categorizeAndPrioritize(
			items,
			(item) => item,
			recentSet,
			twoHopSet,
			backlinkSet,
			configs
		);

		// Recent is disabled, so should be TWO_HOP
		expect(results[0].group).toBe(ResultGroup.TWO_HOP);
	});

	it('should handle custom itemToId function', () => {
		const items = [
			{ path: 'file1.md', name: 'File 1' },
			{ path: 'file2.md', name: 'File 2' }
		];
		const recentSet = new Set(['file1.md']);
		const configs = {
			recentFiles: { enabled: true, priority: 1 },
			twoHopLinks: { enabled: true, priority: 2 },
			backlinks: { enabled: true, priority: 3 }
		};

		const results = categorizeAndPrioritize(
			items,
			(item) => item.path,
			recentSet,
			new Set(),
			new Set(),
			configs
		);

		expect(results[0].item).toEqual({ path: 'file1.md', name: 'File 1' });
		expect(results[0].group).toBe(ResultGroup.RECENT);
	});
});

describe('sortByPriority', () => {
	it('should sort by priority (lower number first)', () => {
		const results = [
			{ item: 'file1.md', group: ResultGroup.BACKLINK, priority: 3 },
			{ item: 'file2.md', group: ResultGroup.RECENT, priority: 1 },
			{ item: 'file3.md', group: ResultGroup.TWO_HOP, priority: 2 }
		];

		const sorted = sortByPriority(results, (item) => item);

		expect(sorted[0].item).toBe('file2.md');
		expect(sorted[1].item).toBe('file3.md');
		expect(sorted[2].item).toBe('file1.md');
	});

	it('should sort alphabetically within same priority', () => {
		const results = [
			{ item: 'charlie.md', group: ResultGroup.RECENT, priority: 1 },
			{ item: 'alice.md', group: ResultGroup.RECENT, priority: 1 },
			{ item: 'bob.md', group: ResultGroup.RECENT, priority: 1 }
		];

		const sorted = sortByPriority(results, (item) => item);

		expect(sorted[0].item).toBe('alice.md');
		expect(sorted[1].item).toBe('bob.md');
		expect(sorted[2].item).toBe('charlie.md');
	});

	it('should handle mixed priorities and names', () => {
		const results = [
			{ item: 'zebra.md', group: ResultGroup.OTHER, priority: 999 },
			{ item: 'apple.md', group: ResultGroup.RECENT, priority: 1 },
			{ item: 'banana.md', group: ResultGroup.RECENT, priority: 1 },
			{ item: 'cherry.md', group: ResultGroup.TWO_HOP, priority: 2 }
		];

		const sorted = sortByPriority(results, (item) => item);

		expect(sorted.map(r => r.item)).toEqual([
			'apple.md',
			'banana.md',
			'cherry.md',
			'zebra.md'
		]);
	});

	it('should not mutate original array', () => {
		const results = [
			{ item: 'b.md', group: ResultGroup.RECENT, priority: 2 },
			{ item: 'a.md', group: ResultGroup.RECENT, priority: 1 }
		];
		const original = [...results];

		sortByPriority(results, (item) => item);

		expect(results).toEqual(original);
	});

	it('should handle custom itemToName function', () => {
		const results = [
			{ item: { path: 'file1.md', name: 'Zebra' }, group: ResultGroup.RECENT, priority: 1 },
			{ item: { path: 'file2.md', name: 'Apple' }, group: ResultGroup.RECENT, priority: 1 }
		];

		const sorted = sortByPriority(results, (item) => item.name);

		expect(sorted[0].item.name).toBe('Apple');
		expect(sorted[1].item.name).toBe('Zebra');
	});
});

describe('filterByGroups', () => {
	it('should keep only items in allowed groups', () => {
		const results = [
			{ item: 'file1.md', group: ResultGroup.RECENT, priority: 1 },
			{ item: 'file2.md', group: ResultGroup.TWO_HOP, priority: 2 },
			{ item: 'file3.md', group: ResultGroup.BACKLINK, priority: 3 },
			{ item: 'file4.md', group: ResultGroup.OTHER, priority: 999 }
		];

		const filtered = filterByGroups(
			results,
			new Set([ResultGroup.RECENT, ResultGroup.BACKLINK])
		);

		expect(filtered).toHaveLength(2);
		expect(filtered.map(r => r.item)).toEqual(['file1.md', 'file3.md']);
	});

	it('should return empty array if no groups match', () => {
		const results = [
			{ item: 'file1.md', group: ResultGroup.RECENT, priority: 1 }
		];

		const filtered = filterByGroups(results, new Set([ResultGroup.TWO_HOP]));

		expect(filtered).toEqual([]);
	});

	it('should return all items if all groups allowed', () => {
		const results = [
			{ item: 'file1.md', group: ResultGroup.RECENT, priority: 1 },
			{ item: 'file2.md', group: ResultGroup.OTHER, priority: 999 }
		];

		const filtered = filterByGroups(
			results,
			new Set([ResultGroup.RECENT, ResultGroup.TWO_HOP, ResultGroup.BACKLINK, ResultGroup.OTHER])
		);

		expect(filtered).toEqual(results);
	});
});

describe('getItemsByGroup', () => {
	it('should extract items from specific group', () => {
		const results = [
			{ item: 'file1.md', group: ResultGroup.RECENT, priority: 1 },
			{ item: 'file2.md', group: ResultGroup.RECENT, priority: 1 },
			{ item: 'file3.md', group: ResultGroup.TWO_HOP, priority: 2 }
		];

		const recentItems = getItemsByGroup(results, ResultGroup.RECENT);

		expect(recentItems).toEqual(['file1.md', 'file2.md']);
	});

	it('should return empty array for group with no items', () => {
		const results = [
			{ item: 'file1.md', group: ResultGroup.RECENT, priority: 1 }
		];

		const backlinkItems = getItemsByGroup(results, ResultGroup.BACKLINK);

		expect(backlinkItems).toEqual([]);
	});
});

describe('countByGroup', () => {
	it('should count items in each group', () => {
		const results = [
			{ item: 'file1.md', group: ResultGroup.RECENT, priority: 1 },
			{ item: 'file2.md', group: ResultGroup.RECENT, priority: 1 },
			{ item: 'file3.md', group: ResultGroup.TWO_HOP, priority: 2 },
			{ item: 'file4.md', group: ResultGroup.BACKLINK, priority: 3 },
			{ item: 'file5.md', group: ResultGroup.OTHER, priority: 999 },
			{ item: 'file6.md', group: ResultGroup.OTHER, priority: 999 }
		];

		const counts = countByGroup(results);

		expect(counts).toEqual({
			[ResultGroup.RECENT]: 2,
			[ResultGroup.TWO_HOP]: 1,
			[ResultGroup.BACKLINK]: 1,
			[ResultGroup.OTHER]: 2
		});
	});

	it('should return zero counts for empty array', () => {
		const counts = countByGroup([]);

		expect(counts).toEqual({
			[ResultGroup.RECENT]: 0,
			[ResultGroup.TWO_HOP]: 0,
			[ResultGroup.BACKLINK]: 0,
			[ResultGroup.OTHER]: 0
		});
	});

	it('should handle single group', () => {
		const results = [
			{ item: 'file1.md', group: ResultGroup.RECENT, priority: 1 },
			{ item: 'file2.md', group: ResultGroup.RECENT, priority: 1 }
		];

		const counts = countByGroup(results);

		expect(counts[ResultGroup.RECENT]).toBe(2);
		expect(counts[ResultGroup.TWO_HOP]).toBe(0);
		expect(counts[ResultGroup.BACKLINK]).toBe(0);
		expect(counts[ResultGroup.OTHER]).toBe(0);
	});
});
