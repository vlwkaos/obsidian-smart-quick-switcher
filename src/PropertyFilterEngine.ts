import { App, TFile } from 'obsidian';
import { PropertyFilter } from './types';
import { passesAllPropertyFilters } from './utils/propertyFilterUtils';

/**
 * Handles property-based filtering of files
 * Delegates pure logic to propertyFilterUtils for testability
 */
export class PropertyFilterEngine {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Check if a file passes all property filters (AND logic)
	 */
	public passesFilters(file: TFile, filters: PropertyFilter[]): boolean {
		const cache = this.app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;
		return passesAllPropertyFilters(frontmatter, filters);
	}

	/**
	 * Filter a list of files based on property filters
	 */
	public filterFiles(files: TFile[], filters: PropertyFilter[]): TFile[] {
		if (filters.length === 0) {
			return files;
		}

		return files.filter(file => this.passesFilters(file, filters));
	}
}
