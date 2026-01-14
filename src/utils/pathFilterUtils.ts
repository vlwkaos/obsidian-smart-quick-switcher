/**
 * Pure utility functions for path-based file filtering
 */

/**
 * Check if a file path is inside any of the excluded folders
 * 
 * @param filePath - Full file path (e.g., "templates/daily.md")
 * @param excludedFolders - List of folder paths to exclude (e.g., ["templates/", "archive/old/"])
 * @returns true if file should be excluded
 * 
 * @example
 * isPathExcluded("templates/daily.md", ["templates/"]) // true
 * isPathExcluded("notes/daily.md", ["templates/"]) // false
 * isPathExcluded("temp/file.md", ["templates/"]) // false (exact folder match)
 */
export function isPathExcluded(filePath: string, excludedFolders: string[]): boolean {
	if (excludedFolders.length === 0) {
		return false;
	}
	
	return excludedFolders.some(folder => {
		// Normalize: ensure folder ends with / for proper folder matching
		const normalizedFolder = folder.endsWith('/') ? folder : folder + '/';
		
		// File is excluded if it's inside this exact folder (or nested within)
		return filePath.startsWith(normalizedFolder);
	});
}

/**
 * Filter out files that are inside excluded folders
 * 
 * @param files - Array of file-like objects with a 'path' property
 * @param excludedFolders - List of folder paths to exclude
 * @returns Filtered array with excluded files removed
 * 
 * @example
 * const files = [
 *   { path: "templates/daily.md" },
 *   { path: "notes/project.md" }
 * ];
 * filterByExcludedPaths(files, ["templates/"]) // [{ path: "notes/project.md" }]
 */
export function filterByExcludedPaths<T extends { path: string }>(
	files: T[],
	excludedFolders: string[]
): T[] {
	if (excludedFolders.length === 0) {
		return files;
	}
	
	return files.filter(file => !isPathExcluded(file.path, excludedFolders));
}
