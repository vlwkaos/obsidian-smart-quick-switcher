import { describe, it, expect } from 'vitest';
import { isPathExcluded, filterByExcludedPaths } from './pathFilterUtils';

describe('isPathExcluded', () => {
	it('returns false for empty excluded folders', () => {
		expect(isPathExcluded('any/path.md', [])).toBe(false);
		expect(isPathExcluded('templates/daily.md', [])).toBe(false);
	});

	it('excludes files in exact folder with trailing slash', () => {
		expect(isPathExcluded('templates/daily.md', ['templates/'])).toBe(true);
		expect(isPathExcluded('templates/weekly.md', ['templates/'])).toBe(true);
	});

	it('excludes files in exact folder without trailing slash', () => {
		expect(isPathExcluded('templates/daily.md', ['templates'])).toBe(true);
		expect(isPathExcluded('archive/old.md', ['archive'])).toBe(true);
	});

	it('excludes files in nested paths within folder', () => {
		expect(isPathExcluded('templates/sub/file.md', ['templates/'])).toBe(true);
		expect(isPathExcluded('archive/2024/01/note.md', ['archive/'])).toBe(true);
	});

	it('does not exclude files in similarly named folders', () => {
		// 'temp/' should NOT exclude 'templates/'
		expect(isPathExcluded('templates/daily.md', ['temp/'])).toBe(false);
		expect(isPathExcluded('templates-new/file.md', ['templates/'])).toBe(false);
	});

	it('excludes from nested folder path', () => {
		expect(isPathExcluded('archive/old/2020.md', ['archive/old/'])).toBe(true);
		expect(isPathExcluded('archive/old/sub/file.md', ['archive/old/'])).toBe(true);
		// But not sibling folders
		expect(isPathExcluded('archive/new/2024.md', ['archive/old/'])).toBe(false);
	});

	it('handles multiple excluded folders with OR logic', () => {
		const excluded = ['templates/', 'archive/', 'drafts/'];
		expect(isPathExcluded('templates/a.md', excluded)).toBe(true);
		expect(isPathExcluded('archive/b.md', excluded)).toBe(true);
		expect(isPathExcluded('drafts/c.md', excluded)).toBe(true);
		expect(isPathExcluded('notes/d.md', excluded)).toBe(false);
	});

	it('does not exclude root-level files', () => {
		expect(isPathExcluded('README.md', ['templates/'])).toBe(false);
		expect(isPathExcluded('index.md', ['archive/'])).toBe(false);
	});

	it('is case-sensitive', () => {
		expect(isPathExcluded('Templates/daily.md', ['templates/'])).toBe(false);
		expect(isPathExcluded('templates/daily.md', ['Templates/'])).toBe(false);
	});
});

describe('filterByExcludedPaths', () => {
	it('returns all files when no exclusions', () => {
		const files = [
			{ path: 'templates/a.md' },
			{ path: 'notes/b.md' },
			{ path: 'archive/c.md' }
		];
		const result = filterByExcludedPaths(files, []);
		expect(result).toEqual(files);
		expect(result.length).toBe(3);
	});

	it('filters out files in excluded folder', () => {
		const files = [
			{ path: 'templates/daily.md' },
			{ path: 'notes/project.md' },
			{ path: 'templates/weekly.md' }
		];
		const result = filterByExcludedPaths(files, ['templates/']);
		expect(result).toEqual([{ path: 'notes/project.md' }]);
		expect(result.length).toBe(1);
	});

	it('handles multiple exclusion patterns', () => {
		const files = [
			{ path: 'templates/a.md' },
			{ path: 'archive/b.md' },
			{ path: 'notes/c.md' },
			{ path: 'drafts/d.md' }
		];
		const result = filterByExcludedPaths(files, ['templates/', 'archive/']);
		expect(result).toEqual([
			{ path: 'notes/c.md' },
			{ path: 'drafts/d.md' }
		]);
		expect(result.length).toBe(2);
	});

	it('preserves file objects with additional properties', () => {
		const files = [
			{ path: 'templates/a.md', name: 'A', size: 100 },
			{ path: 'notes/b.md', name: 'B', size: 200 }
		];
		const result = filterByExcludedPaths(files, ['templates/']);
		expect(result).toEqual([{ path: 'notes/b.md', name: 'B', size: 200 }]);
		expect(result[0].name).toBe('B');
		expect(result[0].size).toBe(200);
	});

	it('returns empty array when all files are excluded', () => {
		const files = [
			{ path: 'templates/a.md' },
			{ path: 'templates/b.md' }
		];
		const result = filterByExcludedPaths(files, ['templates/']);
		expect(result).toEqual([]);
		expect(result.length).toBe(0);
	});

	it('handles nested folder exclusions correctly', () => {
		const files = [
			{ path: 'archive/old/2020.md' },
			{ path: 'archive/old/2021.md' },
			{ path: 'archive/new/2024.md' },
			{ path: 'notes/current.md' }
		];
		const result = filterByExcludedPaths(files, ['archive/old/']);
		expect(result).toEqual([
			{ path: 'archive/new/2024.md' },
			{ path: 'notes/current.md' }
		]);
		expect(result.length).toBe(2);
	});
});
