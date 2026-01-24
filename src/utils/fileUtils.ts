import { App, TFile } from 'obsidian';

/**
 * Supported file extensions for the Smart Quick Switcher.
 * These are treated as first-class citizens alongside markdown files.
 */
export const SUPPORTED_EXTENSIONS = ['.md', '.canvas', '.base'] as const;

export type SupportedExtension = typeof SUPPORTED_EXTENSIONS[number];

/**
 * Check if a file has a supported extension.
 * 
 * @param file - File to check (can be TFile or just a path string)
 * @returns true if the file extension is in SUPPORTED_EXTENSIONS
 * 
 * @example
 * isSupportedFile({ extension: 'md' }) // true
 * isSupportedFile({ extension: 'canvas' }) // true
 * isSupportedFile({ extension: 'base' }) // true
 * isSupportedFile({ extension: 'png' }) // false
 */
export function isSupportedFile(file: { extension: string }): boolean {
	const ext = '.' + file.extension;
	return SUPPORTED_EXTENSIONS.includes(ext as SupportedExtension);
}

/**
 * Get all supported files from the vault.
 * Includes .md, .canvas, and .base files.
 * 
 * @param app - Obsidian App instance
 * @returns Array of TFile objects for all supported file types
 * 
 * @example
 * const files = getSupportedFiles(app);
 * // Returns all .md, .canvas, and .base files
 */
export function getSupportedFiles(app: App): TFile[] {
	return app.vault.getFiles().filter(file => isSupportedFile(file));
}
