/**
 * Pure utility functions for link analysis
 * These functions work with plain data structures for easy testing
 */

export interface LinkGraph {
	// Map of file path to array of paths it links to
	[sourcePath: string]: string[];
}

/**
 * Extract backlinks from a link graph
 * @param linkGraph - Map of file paths to their outgoing links
 * @param targetPath - The file path to find backlinks for
 * @returns Array of file paths that link to the target
 */
export function getBacklinksFromGraph(
	linkGraph: LinkGraph,
	targetPath: string
): string[] {
	const backlinks: string[] = [];

	for (const [sourcePath, outgoingLinks] of Object.entries(linkGraph)) {
		if (outgoingLinks.includes(targetPath)) {
			backlinks.push(sourcePath);
		}
	}

	return backlinks;
}

/**
 * Extract two-hop links from a link graph
 * Two-hop links are files linked by files that link to the target
 * 
 * Example: If A links to target, and A also links to B,
 * then B is a two-hop link from target.
 * 
 * @param linkGraph - Map of file paths to their outgoing links
 * @param targetPath - The file path to find two-hop links for
 * @returns Array of unique file paths that are two hops away
 */
export function getTwoHopLinksFromGraph(
	linkGraph: LinkGraph,
	targetPath: string
): string[] {
	const backlinks = getBacklinksFromGraph(linkGraph, targetPath);
	const backlinkSet = new Set(backlinks);
	const twoHopSet = new Set<string>();

	for (const backlinkPath of backlinks) {
		const outgoingLinks = linkGraph[backlinkPath] || [];
		
		for (const linkedPath of outgoingLinks) {
			// Exclude: target file, the backlink file itself, and other backlinks
			if (
				linkedPath !== targetPath && 
				linkedPath !== backlinkPath &&
				!backlinkSet.has(linkedPath)
			) {
				twoHopSet.add(linkedPath);
			}
		}
	}

	return Array.from(twoHopSet);
}

/**
 * Check if a file is a backlink of the target
 * @param linkGraph - Map of file paths to their outgoing links
 * @param filePath - The file to check
 * @param targetPath - The target file
 * @returns true if filePath links to targetPath
 */
export function isBacklink(
	linkGraph: LinkGraph,
	filePath: string,
	targetPath: string
): boolean {
	const backlinks = getBacklinksFromGraph(linkGraph, targetPath);
	return backlinks.includes(filePath);
}

/**
 * Check if a file is a two-hop link of the target
 * @param linkGraph - Map of file paths to their outgoing links
 * @param filePath - The file to check
 * @param targetPath - The target file
 * @returns true if filePath is a two-hop link from targetPath
 */
export function isTwoHopLink(
	linkGraph: LinkGraph,
	filePath: string,
	targetPath: string
): boolean {
	const twoHopLinks = getTwoHopLinksFromGraph(linkGraph, targetPath);
	return twoHopLinks.includes(filePath);
}
