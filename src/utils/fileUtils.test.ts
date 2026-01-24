import { describe, it, expect } from 'vitest';
import { isSupportedFile, SUPPORTED_EXTENSIONS } from './fileUtils';

describe('isSupportedFile', () => {
	it('returns true for markdown files', () => {
		expect(isSupportedFile({ extension: 'md' })).toBe(true);
	});

	it('returns true for canvas files', () => {
		expect(isSupportedFile({ extension: 'canvas' })).toBe(true);
	});

	it('returns true for base files', () => {
		expect(isSupportedFile({ extension: 'base' })).toBe(true);
	});

	it('returns false for image files', () => {
		expect(isSupportedFile({ extension: 'png' })).toBe(false);
		expect(isSupportedFile({ extension: 'jpg' })).toBe(false);
		expect(isSupportedFile({ extension: 'gif' })).toBe(false);
	});

	it('returns false for other common file types', () => {
		expect(isSupportedFile({ extension: 'pdf' })).toBe(false);
		expect(isSupportedFile({ extension: 'json' })).toBe(false);
		expect(isSupportedFile({ extension: 'css' })).toBe(false);
		expect(isSupportedFile({ extension: 'js' })).toBe(false);
	});

	it('returns false for empty extension', () => {
		expect(isSupportedFile({ extension: '' })).toBe(false);
	});
});

describe('SUPPORTED_EXTENSIONS', () => {
	it('contains md, canvas, and base', () => {
		expect(SUPPORTED_EXTENSIONS).toContain('.md');
		expect(SUPPORTED_EXTENSIONS).toContain('.canvas');
		expect(SUPPORTED_EXTENSIONS).toContain('.base');
	});

	it('has exactly 3 supported extensions', () => {
		expect(SUPPORTED_EXTENSIONS.length).toBe(3);
	});
});
