/**
 * Pure utility functions for property filtering
 * These functions have no side effects and are easily testable
 */

import type { PropertyFilter } from '../types';

/**
 * Compare property value with filter value
 * @param propertyValue - The value from the frontmatter
 * @param filterValue - The value from the filter
 * @param exactMatch - Whether to match exactly or check contains
 * @returns true if values match according to exactMatch rule
 */
export function compareValues(
	propertyValue: any,
	filterValue: string,
	exactMatch: boolean
): boolean {
	if (propertyValue === undefined || propertyValue === null) {
		return false;
	}

	// Handle array values
	if (Array.isArray(propertyValue)) {
		return propertyValue.some(val => 
			compareValues(val, filterValue, exactMatch)
		);
	}

	// Convert to string for comparison
	const propStr = String(propertyValue).toLowerCase();
	const filterStr = filterValue.toLowerCase();

	if (exactMatch) {
		return propStr === filterStr;
	} else {
		return propStr.includes(filterStr);
	}
}

/**
 * Check if property value contains the filter value
 * @param propertyValue - The value from the frontmatter
 * @param filterValue - The value to search for
 * @returns true if propertyValue contains filterValue
 */
export function containsValue(propertyValue: any, filterValue: string): boolean {
	if (propertyValue === undefined || propertyValue === null) {
		return false;
	}

	// Handle array values
	if (Array.isArray(propertyValue)) {
		return propertyValue.some(val => containsValue(val, filterValue));
	}

	// Convert to string and check contains
	const propStr = String(propertyValue).toLowerCase();
	const filterStr = filterValue.toLowerCase();
	return propStr.includes(filterStr);
}

/**
 * Check if frontmatter data passes a single property filter
 * @param frontmatter - The frontmatter object (or null/undefined)
 * @param filter - The filter to apply
 * @returns true if the filter passes
 */
export function passesPropertyFilter(
	frontmatter: Record<string, any> | null | undefined,
	filter: PropertyFilter
): boolean {
	if (!frontmatter) {
		// No frontmatter: only passes 'not-exists' filter
		return filter.operator === 'not-exists';
	}

	const propertyValue = frontmatter[filter.propertyKey];

	switch (filter.operator) {
		case 'exists':
			return propertyValue !== undefined;

		case 'not-exists':
			return propertyValue === undefined;

		case 'equals':
			return compareValues(propertyValue, filter.value, true);

		case 'not-equals':
			// Property must exist AND not equal the value
			if (propertyValue === undefined) {
				return false; // Missing property doesn't pass "not-equals"
			}
			return !compareValues(propertyValue, filter.value, true);

		case 'contains':
			return containsValue(propertyValue, filter.value);

		default:
			return false;
	}
}

/**
 * Check if frontmatter passes all property filters (AND logic)
 * @param frontmatter - The frontmatter object (or null/undefined)
 * @param filters - Array of filters to apply
 * @returns true if all filters pass
 */
export function passesAllPropertyFilters(
	frontmatter: Record<string, any> | null | undefined,
	filters: PropertyFilter[]
): boolean {
	if (filters.length === 0) {
		return true;
	}

	// All filters must pass (AND logic)
	return filters.every(filter => passesPropertyFilter(frontmatter, filter));
}
