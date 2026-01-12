/**
 * Pure utility functions for LRU cache logic
 */

/**
 * Add an item to LRU cache
 * @param cache - Current cache array (newest first)
 * @param item - Item to add
 * @param maxSize - Maximum cache size
 * @returns New cache array with item added
 */
export function addToLRUCache<T>(
	cache: T[],
	item: T,
	maxSize: number
): T[] {
	// Remove item if already exists
	const filtered = cache.filter(cachedItem => cachedItem !== item);
	
	// Add to front
	const newCache = [item, ...filtered];
	
	// Trim to max size
	if (newCache.length > maxSize) {
		return newCache.slice(0, maxSize);
	}
	
	return newCache;
}

/**
 * Check if item is in LRU cache
 * @param cache - Current cache array
 * @param item - Item to check
 * @returns true if item is in cache
 */
export function isInLRUCache<T>(cache: T[], item: T): boolean {
	return cache.includes(item);
}

/**
 * Get all items from LRU cache (newest first)
 * @param cache - Current cache array
 * @returns Copy of cache array
 */
export function getLRUCache<T>(cache: T[]): T[] {
	return [...cache];
}

/**
 * Clear LRU cache
 * @returns Empty cache array
 */
export function clearLRUCache<T>(): T[] {
	return [];
}

/**
 * Resize LRU cache
 * @param cache - Current cache array
 * @param newSize - New maximum size
 * @returns Resized cache array
 */
export function resizeLRUCache<T>(cache: T[], newSize: number): T[] {
	if (cache.length <= newSize) {
		return [...cache];
	}
	return cache.slice(0, newSize);
}
