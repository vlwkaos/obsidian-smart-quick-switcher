import { describe, it, expect } from 'vitest';
import { TFile } from 'obsidian';

/**
 * Mock TFile for testing
 */
function createMockFile(basename: string, path: string): TFile {
	return {
		basename,
		path,
		name: basename + '.md',
		extension: 'md',
		parent: null,
		vault: null as any,
		stat: { ctime: 0, mtime: 0, size: 0 }
	} as TFile;
}

describe('Current file filtering', () => {
	it('should exclude current file from results', () => {
		const currentFile = createMockFile('current', 'current.md');
		const allFiles = [
			createMockFile('current', 'current.md'),
			createMockFile('other1', 'other1.md'),
			createMockFile('other2', 'other2.md')
		];
		
		// Filter out current file
		const filtered = allFiles.filter(f => f.path !== currentFile.path);
		
		expect(filtered.length).toBe(2);
		expect(filtered.some(f => f.path === 'current.md')).toBe(false);
		expect(filtered.some(f => f.path === 'other1.md')).toBe(true);
		expect(filtered.some(f => f.path === 'other2.md')).toBe(true);
	});

	it('should handle empty file list', () => {
		const currentFile = createMockFile('current', 'current.md');
		const allFiles: TFile[] = [];
		
		const filtered = allFiles.filter(f => f.path !== currentFile.path);
		
		expect(filtered.length).toBe(0);
	});

	it('should handle current file not in list', () => {
		const currentFile = createMockFile('current', 'current.md');
		const allFiles = [
			createMockFile('other1', 'other1.md'),
			createMockFile('other2', 'other2.md')
		];
		
		const filtered = allFiles.filter(f => f.path !== currentFile.path);
		
		expect(filtered.length).toBe(2);  // No change
	});

	it('should filter current file even if it is a recent file', () => {
		const currentFile = createMockFile('current', 'current.md');
		const recentFiles = [
			createMockFile('current', 'current.md'),  // Current file is recent
			createMockFile('recent1', 'recent1.md')
		];
		
		// Current file should be excluded even though it's recent
		const filtered = recentFiles.filter(f => f.path !== currentFile.path);
		
		expect(filtered.length).toBe(1);
		expect(filtered[0].path).toBe('recent1.md');
	});

	it('should work with recent files ignoring filters scenario', () => {
		const currentFile = createMockFile('current', 'current.md');
		
		// Filtered files (matched property filter)
		const filteredFiles = [
			createMockFile('current', 'current.md'),   // Current file
			createMockFile('filtered1', 'filtered1.md')
		];
		
		// Recent files (some bypass property filter)
		const recentFiles = [
			createMockFile('current', 'current.md'),   // Current file is recent
			createMockFile('recent1', 'recent1.md')    // Bypasses filter
		];
		
		// Merge recent files with filtered files
		const filteredPaths = new Set(filteredFiles.map(f => f.path));
		const filesToAdd = recentFiles.filter(f => !filteredPaths.has(f.path));
		let finalFiles = [...filteredFiles, ...filesToAdd];
		
		// Filter out current file at the end
		finalFiles = finalFiles.filter(f => f.path !== currentFile.path);
		
		expect(finalFiles.length).toBe(2);
		expect(finalFiles.some(f => f.path === 'current.md')).toBe(false);  // Excluded
		expect(finalFiles.some(f => f.path === 'filtered1.md')).toBe(true);
		expect(finalFiles.some(f => f.path === 'recent1.md')).toBe(true);
	});
});
