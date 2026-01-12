/**
 * Pure utility functions for search result grouping and prioritization
 */

export enum ResultGroup {
	RECENT = 'recent',
	TWO_HOP = 'two-hop',
	BACKLINK = 'backlink',
	OTHER = 'other'
}

export interface GroupConfig {
	enabled: boolean;
	priority: number;
}

export interface SearchResultItem<T = string> {
	item: T;
	group: ResultGroup;
	priority: number;
}

/**
 * Categorize and assign priority to items based on group membership
 * @param items - Array of items to categorize
 * @param recentSet - Set of recent item identifiers
 * @param twoHopSet - Set of two-hop linked item identifiers
 * @param backlinkSet - Set of backlink item identifiers
 * @param groupConfigs - Priority configuration for each group
 * @returns Array of items with assigned groups and priorities
 */
export function categorizeAndPrioritize<T>(
	items: T[],
	itemToId: (item: T) => string,
	recentSet: Set<string>,
	twoHopSet: Set<string>,
	backlinkSet: Set<string>,
	groupConfigs: {
		recentFiles: GroupConfig;
		twoHopLinks: GroupConfig;
		backlinks: GroupConfig;
	}
): SearchResultItem<T>[] {
	return items.map(item => {
		const id = itemToId(item);
		let group: ResultGroup = ResultGroup.OTHER;
		let priority = 999;

		// Check group membership and assign priority
		// Order matters: earlier checks have precedence
		if (groupConfigs.recentFiles.enabled && recentSet.has(id)) {
			group = ResultGroup.RECENT;
			priority = groupConfigs.recentFiles.priority;
		} else if (groupConfigs.twoHopLinks.enabled && twoHopSet.has(id)) {
			group = ResultGroup.TWO_HOP;
			priority = groupConfigs.twoHopLinks.priority;
		} else if (groupConfigs.backlinks.enabled && backlinkSet.has(id)) {
			group = ResultGroup.BACKLINK;
			priority = groupConfigs.backlinks.priority;
		}

		return { item, group, priority };
	});
}

/**
 * Sort search results by priority and name
 * @param results - Array of search results to sort
 * @param itemToName - Function to extract name from item for alphabetical sorting
 * @returns Sorted array of search results
 */
export function sortByPriority<T>(
	results: SearchResultItem<T>[],
	itemToName: (item: T) => string
): SearchResultItem<T>[] {
	return [...results].sort((a, b) => {
		// Lower priority number = higher priority
		if (a.priority !== b.priority) {
			return a.priority - b.priority;
		}
		
		// Same priority: sort alphabetically
		return itemToName(a.item).localeCompare(itemToName(b.item));
	});
}

/**
 * Filter items by group membership
 * @param results - Array of search results
 * @param allowedGroups - Set of groups to keep
 * @returns Filtered array containing only allowed groups
 */
export function filterByGroups<T>(
	results: SearchResultItem<T>[],
	allowedGroups: Set<ResultGroup>
): SearchResultItem<T>[] {
	return results.filter(result => allowedGroups.has(result.group));
}

/**
 * Get items from a specific group
 * @param results - Array of search results
 * @param group - The group to extract
 * @returns Array of items in the specified group
 */
export function getItemsByGroup<T>(
	results: SearchResultItem<T>[],
	group: ResultGroup
): T[] {
	return results
		.filter(result => result.group === group)
		.map(result => result.item);
}

/**
 * Count items in each group
 * @param results - Array of search results
 * @returns Map of group to count
 */
export function countByGroup<T>(
	results: SearchResultItem<T>[]
): Record<ResultGroup, number> {
	const counts: Record<ResultGroup, number> = {
		[ResultGroup.RECENT]: 0,
		[ResultGroup.TWO_HOP]: 0,
		[ResultGroup.BACKLINK]: 0,
		[ResultGroup.OTHER]: 0
	};

	for (const result of results) {
		counts[result.group]++;
	}

	return counts;
}
