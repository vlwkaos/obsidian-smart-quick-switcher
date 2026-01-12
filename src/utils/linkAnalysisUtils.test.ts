import { describe, it, expect } from 'vitest';
import {
	LinkGraph,
	getBacklinksFromGraph,
	getTwoHopLinksFromGraph,
	isBacklink,
	isTwoHopLink
} from './linkAnalysisUtils';

describe('getBacklinksFromGraph', () => {
	it('should return empty array for file with no backlinks', () => {
		const graph: LinkGraph = {
			'file1.md': ['file2.md'],
			'file2.md': ['file3.md']
		};
		
		expect(getBacklinksFromGraph(graph, 'file1.md')).toEqual([]);
	});

	it('should return files that link to the target', () => {
		const graph: LinkGraph = {
			'file1.md': ['target.md'],
			'file2.md': ['target.md'],
			'file3.md': ['other.md']
		};
		
		const backlinks = getBacklinksFromGraph(graph, 'target.md');
		expect(backlinks).toHaveLength(2);
		expect(backlinks).toContain('file1.md');
		expect(backlinks).toContain('file2.md');
	});

	it('should handle multiple links from same file', () => {
		const graph: LinkGraph = {
			'file1.md': ['target.md', 'other.md', 'target.md'], // duplicate
			'file2.md': ['target.md']
		};
		
		const backlinks = getBacklinksFromGraph(graph, 'target.md');
		expect(backlinks).toEqual(['file1.md', 'file2.md']);
	});

	it('should handle empty graph', () => {
		const graph: LinkGraph = {};
		expect(getBacklinksFromGraph(graph, 'target.md')).toEqual([]);
	});

	it('should handle file with no outgoing links', () => {
		const graph: LinkGraph = {
			'file1.md': [],
			'file2.md': ['target.md']
		};
		
		expect(getBacklinksFromGraph(graph, 'target.md')).toEqual(['file2.md']);
	});
});

describe('getTwoHopLinksFromGraph', () => {
	it('should return empty array for file with no backlinks', () => {
		const graph: LinkGraph = {
			'file1.md': ['file2.md'],
			'file2.md': ['file3.md']
		};
		
		expect(getTwoHopLinksFromGraph(graph, 'target.md')).toEqual([]);
	});

	it('should find two-hop links correctly', () => {
		const graph: LinkGraph = {
			'backlink1.md': ['target.md', 'twohop1.md', 'twohop2.md'],
			'backlink2.md': ['target.md', 'twohop3.md'],
			'other.md': ['unrelated.md']
		};
		
		const twoHopLinks = getTwoHopLinksFromGraph(graph, 'target.md');
		expect(twoHopLinks).toHaveLength(3);
		expect(twoHopLinks).toContain('twohop1.md');
		expect(twoHopLinks).toContain('twohop2.md');
		expect(twoHopLinks).toContain('twohop3.md');
	});

	it('should exclude the target file from two-hop results', () => {
		const graph: LinkGraph = {
			'backlink.md': ['target.md', 'target.md', 'twohop.md']
		};
		
		const twoHopLinks = getTwoHopLinksFromGraph(graph, 'target.md');
		expect(twoHopLinks).toEqual(['twohop.md']);
		expect(twoHopLinks).not.toContain('target.md');
	});

	it('should exclude backlink files from two-hop results', () => {
		const graph: LinkGraph = {
			'backlink1.md': ['target.md', 'backlink2.md', 'twohop.md'],
			'backlink2.md': ['target.md', 'backlink1.md']
		};
		
		const twoHopLinks = getTwoHopLinksFromGraph(graph, 'target.md');
		expect(twoHopLinks).toEqual(['twohop.md']);
		expect(twoHopLinks).not.toContain('backlink1.md');
		expect(twoHopLinks).not.toContain('backlink2.md');
	});

	it('should handle circular links', () => {
		const graph: LinkGraph = {
			'file1.md': ['target.md', 'file2.md'],
			'file2.md': ['file1.md', 'file3.md'],
			'file3.md': ['file1.md']
		};
		
		const twoHopLinks = getTwoHopLinksFromGraph(graph, 'target.md');
		// file1 links to target, file1 links to file2 (two-hop)
		// file2 doesn't link to target, so file3 is NOT a two-hop
		expect(twoHopLinks).toEqual(['file2.md']);
	});

	it('should deduplicate two-hop links from multiple backlinks', () => {
		const graph: LinkGraph = {
			'backlink1.md': ['target.md', 'shared.md'],
			'backlink2.md': ['target.md', 'shared.md']
		};
		
		const twoHopLinks = getTwoHopLinksFromGraph(graph, 'target.md');
		expect(twoHopLinks).toEqual(['shared.md']);
	});

	it('should handle complex graph structure', () => {
		const graph: LinkGraph = {
			'A.md': ['target.md', 'B.md', 'C.md'],
			'D.md': ['target.md', 'E.md'],
			'F.md': ['G.md'], // not a backlink
			'B.md': ['target.md'] // B is both a two-hop and a backlink
		};
		
		const twoHopLinks = getTwoHopLinksFromGraph(graph, 'target.md');
		// From A: B, C (but B is also a backlink, so excluded)
		// From D: E
		// From B: nothing (B's links are checked but B links to target)
		expect(twoHopLinks.sort()).toEqual(['C.md', 'E.md'].sort());
	});

	it('should handle empty backlinks', () => {
		const graph: LinkGraph = {
			'file1.md': ['target.md']
		};
		
		// file1 has no outgoing links besides target
		expect(getTwoHopLinksFromGraph(graph, 'target.md')).toEqual([]);
	});
});

describe('isBacklink', () => {
	it('should return true if file links to target', () => {
		const graph: LinkGraph = {
			'file1.md': ['target.md'],
			'file2.md': ['other.md']
		};
		
		expect(isBacklink(graph, 'file1.md', 'target.md')).toBe(true);
	});

	it('should return false if file does not link to target', () => {
		const graph: LinkGraph = {
			'file1.md': ['other.md'],
			'file2.md': ['another.md']
		};
		
		expect(isBacklink(graph, 'file1.md', 'target.md')).toBe(false);
	});

	it('should return false for non-existent file', () => {
		const graph: LinkGraph = {
			'file1.md': ['target.md']
		};
		
		expect(isBacklink(graph, 'nonexistent.md', 'target.md')).toBe(false);
	});
});

describe('isTwoHopLink', () => {
	it('should return true for valid two-hop link', () => {
		const graph: LinkGraph = {
			'backlink.md': ['target.md', 'twohop.md']
		};
		
		expect(isTwoHopLink(graph, 'twohop.md', 'target.md')).toBe(true);
	});

	it('should return false for non-two-hop file', () => {
		const graph: LinkGraph = {
			'backlink.md': ['target.md', 'twohop.md']
		};
		
		expect(isTwoHopLink(graph, 'other.md', 'target.md')).toBe(false);
	});

	it('should return false for backlink files', () => {
		const graph: LinkGraph = {
			'backlink.md': ['target.md', 'twohop.md']
		};
		
		expect(isTwoHopLink(graph, 'backlink.md', 'target.md')).toBe(false);
	});

	it('should return false for target file itself', () => {
		const graph: LinkGraph = {
			'backlink.md': ['target.md', 'target.md']
		};
		
		expect(isTwoHopLink(graph, 'target.md', 'target.md')).toBe(false);
	});
});

describe('edge cases', () => {
	it('should handle self-links', () => {
		const graph: LinkGraph = {
			'file1.md': ['file1.md', 'target.md']
		};
		
		expect(getBacklinksFromGraph(graph, 'file1.md')).toEqual(['file1.md']);
		expect(getBacklinksFromGraph(graph, 'target.md')).toEqual(['file1.md']);
	});

	it('should handle deeply nested graph', () => {
		const graph: LinkGraph = {
			'A.md': ['target.md', 'B.md'],
			'B.md': ['C.md'],
			'C.md': ['D.md']
		};
		
		const twoHopLinks = getTwoHopLinksFromGraph(graph, 'target.md');
		// Only B is a two-hop (A -> target, A -> B)
		// C and D are not two-hop links
		expect(twoHopLinks).toEqual(['B.md']);
	});

	it('should handle files with no links at all', () => {
		const graph: LinkGraph = {
			'file1.md': [],
			'file2.md': []
		};
		
		expect(getBacklinksFromGraph(graph, 'target.md')).toEqual([]);
		expect(getTwoHopLinksFromGraph(graph, 'target.md')).toEqual([]);
	});
});
