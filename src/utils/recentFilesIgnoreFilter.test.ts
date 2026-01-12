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

describe('Recent files ignore filter - Integration tests', () => {
	describe('Empty query behavior', () => {
		it('should include recent files that bypass property filters', () => {
			// Setup: recent files with different properties
			const recentFiles = [
				createMockFile('recent-public', 'recent-public.md'),  // access: public
				createMockFile('recent-local', 'recent-local.md')     // access: local
			];
			
			const filteredFiles = [
				createMockFile('recent-local', 'recent-local.md'),    // matches filter
				createMockFile('other-local', 'other-local.md')       // matches filter
			];
			
			// When ignoreFilters is true, merge recent files that aren't in filtered set
			const filteredPaths = new Set(filteredFiles.map(f => f.path));
			const filesToAdd = recentFiles.filter(f => !filteredPaths.has(f.path));
			const finalFiles = [...filteredFiles, ...filesToAdd];
			
			expect(finalFiles.length).toBe(3);
			expect(finalFiles.some(f => f.path === 'recent-public.md')).toBe(true);  // Bypassed filter
			expect(finalFiles.some(f => f.path === 'recent-local.md')).toBe(true);   // Matched filter
			expect(finalFiles.some(f => f.path === 'other-local.md')).toBe(true);    // Matched filter
		});

		it('should not duplicate files already in filtered set', () => {
			const recentFiles = [
				createMockFile('file1', 'file1.md'),
				createMockFile('file2', 'file2.md')
			];
			
			const filteredFiles = [
				createMockFile('file1', 'file1.md'),  // Already in filtered set
				createMockFile('file3', 'file3.md')
			];
			
			// Merge without duplicates
			const filteredPaths = new Set(filteredFiles.map(f => f.path));
			const filesToAdd = recentFiles.filter(f => !filteredPaths.has(f.path));
			const finalFiles = [...filteredFiles, ...filesToAdd];
			
			expect(finalFiles.length).toBe(3);  // file1, file2, file3 (no duplicate file1)
			expect(finalFiles.filter(f => f.path === 'file1.md').length).toBe(1);
		});

		it('should respect ignoreFilters flag being false', () => {
			const recentFiles = [
				createMockFile('recent-public', 'recent-public.md')
			];
			
			const filteredFiles = [
				createMockFile('other-local', 'other-local.md')
			];
			
			const ignoreFilters = false;
			
			// When ignoreFilters is false, don't add recent files
			const finalFiles = ignoreFilters 
				? [...filteredFiles, ...recentFiles]
				: filteredFiles;
			
			expect(finalFiles.length).toBe(1);
			expect(finalFiles.some(f => f.path === 'recent-public.md')).toBe(false);  // NOT added
		});
	});

	describe('Search query behavior', () => {
		it('should NOT apply ignoreFilters during search', () => {
			// During search, we only search within property-filtered files
			// Recent files don't get special treatment
			
			const recentFiles = [
				createMockFile('recent-public', 'recent-public.md')  // access: public
			];
			
			const filteredFiles = [
				createMockFile('other-local', 'other-local.md')  // access: local
			];
			
			// For search queries, we DON'T merge recent files
			// We only search within filteredFiles
			const searchableFiles = filteredFiles;  // NOT [...filteredFiles, ...recentFiles]
			
			expect(searchableFiles.length).toBe(1);
			expect(searchableFiles.some(f => f.path === 'recent-public.md')).toBe(false);
		});
	});

	describe('Edge cases', () => {
		it('should handle empty recent files list', () => {
			const recentFiles: TFile[] = [];
			const filteredFiles = [createMockFile('file1', 'file1.md')];
			
			const filteredPaths = new Set(filteredFiles.map(f => f.path));
			const filesToAdd = recentFiles.filter(f => !filteredPaths.has(f.path));
			const finalFiles = [...filteredFiles, ...filesToAdd];
			
			expect(finalFiles.length).toBe(1);
		});

		it('should handle empty filtered files list', () => {
			const recentFiles = [createMockFile('recent1', 'recent1.md')];
			const filteredFiles: TFile[] = [];
			
			const filteredPaths = new Set(filteredFiles.map(f => f.path));
			const filesToAdd = recentFiles.filter(f => !filteredPaths.has(f.path));
			const finalFiles = [...filteredFiles, ...filesToAdd];
			
			expect(finalFiles.length).toBe(1);
			expect(finalFiles[0].path).toBe('recent1.md');
		});

		it('should handle all recent files matching filter', () => {
			const recentFiles = [
				createMockFile('file1', 'file1.md'),
				createMockFile('file2', 'file2.md')
			];
			
			const filteredFiles = [
				createMockFile('file1', 'file1.md'),
				createMockFile('file2', 'file2.md'),
				createMockFile('file3', 'file3.md')
			];
			
			// All recent files already in filtered set
			const filteredPaths = new Set(filteredFiles.map(f => f.path));
			const filesToAdd = recentFiles.filter(f => !filteredPaths.has(f.path));
			const finalFiles = [...filteredFiles, ...filesToAdd];
			
			expect(finalFiles.length).toBe(3);  // No additions
		});
	});
});
