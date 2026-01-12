import { App, TFile } from 'obsidian';

export interface CategorizedLinks {
	outgoing: Set<string>;      // 1-hop out
	backlinks: Set<string>;     // 1-hop in
	twoHop: Set<string>;        // 2-hop (patterns A, B, C)
}

/**
 * Analyzes link relationships between files
 * Builds backlinks and two-hop links on-demand
 */
export class LinkAnalyzer {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Get files that directly link to the given file (backlinks)
	 */
	public getBacklinks(file: TFile): TFile[] {
		const backlinks: TFile[] = [];
		
		// Use resolvedLinks to find backlinks
		const resolvedLinks = (this.app.metadataCache as any).resolvedLinks;
		if (!resolvedLinks) {
			return backlinks;
		}

		// Find all files that link to the current file
		for (const [sourcePath, links] of Object.entries(resolvedLinks)) {
			if (typeof links === 'object' && links !== null) {
				if (file.path in links) {
					const backlinkFile = this.app.vault.getAbstractFileByPath(sourcePath);
					if (backlinkFile instanceof TFile) {
						backlinks.push(backlinkFile);
					}
				}
			}
		}

		return backlinks;
	}

	/**
	 * Get two-hop links: files that are linked by files that link to the current file
	 * 
	 * Example: If file A links to current file, and file A also links to file B,
	 * then file B is a two-hop link from the current file.
	 */
	public getTwoHopLinks(file: TFile): TFile[] {
		const backlinks = this.getBacklinks(file);
		const twoHopSet = new Set<string>();

		for (const backlinkFile of backlinks) {
			// Get all files that this backlink file links to
			const outgoingLinks = this.getOutgoingLinks(backlinkFile);
			
			for (const linkedFile of outgoingLinks) {
				// Don't include the original file or the backlink file itself
				if (linkedFile.path !== file.path && linkedFile.path !== backlinkFile.path) {
					twoHopSet.add(linkedFile.path);
				}
			}
		}

		// Convert paths back to TFile objects
		const twoHopFiles: TFile[] = [];
		for (const path of twoHopSet) {
			const twoHopFile = this.app.vault.getAbstractFileByPath(path);
			if (twoHopFile instanceof TFile) {
				twoHopFiles.push(twoHopFile);
			}
		}

		return twoHopFiles;
	}

	/**
	 * Get files that the given file links to (outgoing links)
	 */
	public getOutgoingLinks(file: TFile): TFile[] {
		const cache = this.app.metadataCache.getFileCache(file);
		const linkedFiles: TFile[] = [];

		if (!cache) {
			return linkedFiles;
		}

		// Collect all link types: links, embeds, and frontmatter links
		const allLinks = [
			...(cache.links || []),
			...(cache.embeds || []),
			...(cache.frontmatterLinks || [])
		];

		for (const link of allLinks) {
			const linkedFile = this.app.metadataCache.getFirstLinkpathDest(
				link.link,
				file.path
			);
			if (linkedFile instanceof TFile) {
				linkedFiles.push(linkedFile);
			}
		}

		return linkedFiles;
	}

	/**
	 * Get all link relationships categorized by type
	 * Performance optimized: Single pass through link graph
	 */
	public getCategorizedLinks(file: TFile): CategorizedLinks {
		const outgoing = new Set<string>();
		const backlinks = new Set<string>();
		const twoHop = new Set<string>();
		
		// 1. Get direct outgoing links (1-hop out)
		const outgoingFiles = this.getOutgoingLinks(file);
		for (const f of outgoingFiles) {
			outgoing.add(f.path);
		}
		
		// 2. Get backlinks (1-hop in)
		const backlinkFiles = this.getBacklinks(file);
		for (const f of backlinkFiles) {
			backlinks.add(f.path);
		}
		
		// 3. Pattern A: Direct link → Direct link
		// Files linked by files you link to
		for (const outgoingFile of outgoingFiles) {
			const secondLevel = this.getOutgoingLinks(outgoingFile);
			for (const f of secondLevel) {
				if (f.path !== file.path && !outgoing.has(f.path) && !backlinks.has(f.path)) {
					twoHop.add(f.path);
				}
			}
		}
		
		// 4. Pattern B: Backlink → Outgoing
		// Files linked by files that link to you
		for (const backlinkFile of backlinkFiles) {
			const fromBacklink = this.getOutgoingLinks(backlinkFile);
			for (const f of fromBacklink) {
				if (f.path !== file.path && !outgoing.has(f.path) && !backlinks.has(f.path)) {
					twoHop.add(f.path);
				}
			}
		}
		
		// 5. Pattern C: Direct link → Backlink
		// Files that link to files you link to
		for (const outgoingFile of outgoingFiles) {
			const backlinksOfOutgoing = this.getBacklinks(outgoingFile);
			for (const f of backlinksOfOutgoing) {
				if (f.path !== file.path && !outgoing.has(f.path) && !backlinks.has(f.path)) {
					twoHop.add(f.path);
				}
			}
		}
		
		// Pattern D is covered by Pattern B
		
		return { outgoing, backlinks, twoHop };
	}

	/**
	 * Check if a file is a backlink of the given file
	 */
	public isBacklink(file: TFile, targetFile: TFile): boolean {
		const backlinks = this.getBacklinks(targetFile);
		return backlinks.some(bl => bl.path === file.path);
	}

	/**
	 * Check if a file is a two-hop link of the given file
	 */
	public isTwoHopLink(file: TFile, targetFile: TFile): boolean {
		const twoHopLinks = this.getTwoHopLinks(targetFile);
		return twoHopLinks.some(thl => thl.path === file.path);
	}
}
