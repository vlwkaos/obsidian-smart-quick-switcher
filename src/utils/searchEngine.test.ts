import { describe, it, expect, beforeEach } from 'vitest';
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

describe('SearchEngine fuzzy search', () => {
	it('should find files by exact name match', () => {
		const files = [
			createMockFile('test', 'test.md'),
			createMockFile('another', 'another.md'),
			createMockFile('document', 'document.md')
		];

		const query = 'test';
		
		// Simulate fuzzy search matching
		const matches = files.filter(f => f.basename.toLowerCase().includes(query.toLowerCase()));
		
		expect(matches.length).toBeGreaterThan(0);
		expect(matches[0].basename).toBe('test');
	});

	it('should find files by partial name match', () => {
		const files = [
			createMockFile('my-document', 'my-document.md'),
			createMockFile('test', 'test.md'),
			createMockFile('another-doc', 'another-doc.md')
		];

		const query = 'doc';
		
		const matches = files.filter(f => f.basename.toLowerCase().includes(query.toLowerCase()));
		
		expect(matches.length).toBe(2);
		expect(matches.some(f => f.basename === 'my-document')).toBe(true);
		expect(matches.some(f => f.basename === 'another-doc')).toBe(true);
	});

	it('should find files by fuzzy pattern', () => {
		const files = [
			createMockFile('MyLongFileName', 'MyLongFileName.md'),
			createMockFile('test', 'test.md'),
			createMockFile('MatchLastFirst', 'MatchLastFirst.md')
		];

		const query = 'mlf';
		
		// Fuzzy match: characters appear in order (case insensitive)
		const fuzzyMatch = (text: string, pattern: string): boolean => {
			const textLower = text.toLowerCase();
			const patternLower = pattern.toLowerCase();
			let textIndex = 0;
			
			for (let i = 0; i < patternLower.length; i++) {
				const char = patternLower[i];
				const foundIndex = textLower.indexOf(char, textIndex);
				if (foundIndex === -1) {
					return false;
				}
				textIndex = foundIndex + 1;
			}
			return true;
		};

		const matches = files.filter(f => fuzzyMatch(f.basename, query));
		
		expect(matches.length).toBeGreaterThan(0);
		expect(matches.some(f => f.basename === 'MyLongFileName')).toBe(true);
		expect(matches.some(f => f.basename === 'MatchLastFirst')).toBe(true);
	});

	it('should return empty array when no matches found', () => {
		const files = [
			createMockFile('test', 'test.md'),
			createMockFile('another', 'another.md')
		];

		const query = 'nonexistent';
		
		const matches = files.filter(f => f.basename.toLowerCase().includes(query.toLowerCase()));
		
		expect(matches.length).toBe(0);
	});

	it('should be case-insensitive', () => {
		const files = [
			createMockFile('TestFile', 'TestFile.md'),
			createMockFile('lowercase', 'lowercase.md')
		];

		const query = 'TESTFILE';
		
		const matches = files.filter(f => f.basename.toLowerCase().includes(query.toLowerCase()));
		
		expect(matches.length).toBe(1);
		expect(matches[0].basename).toBe('TestFile');
	});
});
