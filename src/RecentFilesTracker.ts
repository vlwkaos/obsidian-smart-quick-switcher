import { App, TFile } from 'obsidian';

/**
 * LRU cache for tracking recently opened files
 * Session-only (cleared on restart)
 */
export class RecentFilesTracker {
	private recentFiles: string[] = [];  // File paths in order (newest first)
	private maxRecent: number;
	private app: App;

	constructor(app: App, maxRecent: number) {
		this.app = app;
		this.maxRecent = maxRecent;
	}

	/**
	 * Register event listeners to track file opens
	 */
	public registerEvents(): void {
		this.app.workspace.on('file-open', (file) => {
			if (file) {
				this.addRecentFile(file.path);
			}
		});
	}

	/**
	 * Add a file to recent files (LRU style)
	 */
	private addRecentFile(path: string): void {
		// Remove if already exists
		this.recentFiles = this.recentFiles.filter(p => p !== path);
		
		// Add to front
		this.recentFiles.unshift(path);
		
		// Trim to max size
		if (this.recentFiles.length > this.maxRecent) {
			this.recentFiles = this.recentFiles.slice(0, this.maxRecent);
		}
	}

	/**
	 * Get all recent file paths
	 */
	public getRecentFiles(): string[] {
		return [...this.recentFiles];
	}

	/**
	 * Check if a file path is in recent files
	 */
	public isRecentFile(path: string): boolean {
		return this.recentFiles.includes(path);
	}

	/**
	 * Get recent files as TFile objects (excluding non-existent files)
	 */
	public getRecentTFiles(): TFile[] {
		const files: TFile[] = [];
		for (const path of this.recentFiles) {
			const file = this.app.vault.getAbstractFileByPath(path);
			if (file instanceof TFile) {
				files.push(file);
			}
		}
		return files;
	}

	/**
	 * Update max recent files limit
	 */
	public setMaxRecent(maxRecent: number): void {
		this.maxRecent = maxRecent;
		if (this.recentFiles.length > maxRecent) {
			this.recentFiles = this.recentFiles.slice(0, maxRecent);
		}
	}

	/**
	 * Clear all recent files
	 */
	public clear(): void {
		this.recentFiles = [];
	}
}
