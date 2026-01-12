import { describe, it, expect } from 'vitest';
import {
	addToLRUCache,
	isInLRUCache,
	getLRUCache,
	clearLRUCache,
	resizeLRUCache
} from './lruCacheUtils';

describe('addToLRUCache', () => {
	it('should add new item to front of cache', () => {
		const cache = ['item1', 'item2'];
		const newCache = addToLRUCache(cache, 'item3', 10);
		
		expect(newCache).toEqual(['item3', 'item1', 'item2']);
	});

	it('should move existing item to front', () => {
		const cache = ['item1', 'item2', 'item3'];
		const newCache = addToLRUCache(cache, 'item2', 10);
		
		expect(newCache).toEqual(['item2', 'item1', 'item3']);
	});

	it('should respect max size limit', () => {
		const cache = ['item1', 'item2', 'item3'];
		const newCache = addToLRUCache(cache, 'item4', 3);
		
		expect(newCache).toHaveLength(3);
		expect(newCache).toEqual(['item4', 'item1', 'item2']);
		expect(newCache).not.toContain('item3'); // oldest item evicted
	});

	it('should handle max size of 1', () => {
		const cache = ['item1'];
		const newCache = addToLRUCache(cache, 'item2', 1);
		
		expect(newCache).toEqual(['item2']);
	});

	it('should handle empty cache', () => {
		const cache: string[] = [];
		const newCache = addToLRUCache(cache, 'item1', 10);
		
		expect(newCache).toEqual(['item1']);
	});

	it('should handle max size of 0', () => {
		const cache = ['item1'];
		const newCache = addToLRUCache(cache, 'item2', 0);
		
		expect(newCache).toEqual([]);
	});

	it('should not mutate original cache', () => {
		const cache = ['item1', 'item2'];
		const original = [...cache];
		
		addToLRUCache(cache, 'item3', 10);
		
		expect(cache).toEqual(original);
	});

	it('should handle adding same item multiple times', () => {
		let cache = ['item1', 'item2'];
		cache = addToLRUCache(cache, 'item1', 10);
		cache = addToLRUCache(cache, 'item1', 10);
		cache = addToLRUCache(cache, 'item1', 10);
		
		expect(cache).toEqual(['item1', 'item2']);
	});

	it('should work with object items', () => {
		const cache = [{ id: 1 }, { id: 2 }];
		const obj3 = { id: 3 };
		const newCache = addToLRUCache(cache, obj3, 10);
		
		expect(newCache).toHaveLength(3);
		expect(newCache[0]).toBe(obj3);
	});
});

describe('isInLRUCache', () => {
	it('should return true for items in cache', () => {
		const cache = ['item1', 'item2', 'item3'];
		
		expect(isInLRUCache(cache, 'item1')).toBe(true);
		expect(isInLRUCache(cache, 'item2')).toBe(true);
		expect(isInLRUCache(cache, 'item3')).toBe(true);
	});

	it('should return false for items not in cache', () => {
		const cache = ['item1', 'item2'];
		
		expect(isInLRUCache(cache, 'item3')).toBe(false);
		expect(isInLRUCache(cache, 'item4')).toBe(false);
	});

	it('should return false for empty cache', () => {
		const cache: string[] = [];
		
		expect(isInLRUCache(cache, 'item1')).toBe(false);
	});
});

describe('getLRUCache', () => {
	it('should return copy of cache', () => {
		const cache = ['item1', 'item2', 'item3'];
		const copy = getLRUCache(cache);
		
		expect(copy).toEqual(cache);
		expect(copy).not.toBe(cache); // different reference
	});

	it('should return empty array for empty cache', () => {
		const cache: string[] = [];
		const copy = getLRUCache(cache);
		
		expect(copy).toEqual([]);
	});

	it('mutations to copy should not affect original', () => {
		const cache = ['item1', 'item2'];
		const copy = getLRUCache(cache);
		
		copy.push('item3');
		
		expect(cache).toEqual(['item1', 'item2']);
		expect(copy).toEqual(['item1', 'item2', 'item3']);
	});
});

describe('clearLRUCache', () => {
	it('should return empty array', () => {
		const cleared = clearLRUCache<string>();
		
		expect(cleared).toEqual([]);
	});
});

describe('resizeLRUCache', () => {
	it('should keep all items if new size is larger', () => {
		const cache = ['item1', 'item2', 'item3'];
		const resized = resizeLRUCache(cache, 10);
		
		expect(resized).toEqual(['item1', 'item2', 'item3']);
	});

	it('should keep all items if new size equals cache size', () => {
		const cache = ['item1', 'item2', 'item3'];
		const resized = resizeLRUCache(cache, 3);
		
		expect(resized).toEqual(['item1', 'item2', 'item3']);
	});

	it('should trim oldest items if new size is smaller', () => {
		const cache = ['item1', 'item2', 'item3', 'item4', 'item5'];
		const resized = resizeLRUCache(cache, 3);
		
		expect(resized).toEqual(['item1', 'item2', 'item3']);
	});

	it('should handle resize to 0', () => {
		const cache = ['item1', 'item2'];
		const resized = resizeLRUCache(cache, 0);
		
		expect(resized).toEqual([]);
	});

	it('should not mutate original cache', () => {
		const cache = ['item1', 'item2', 'item3'];
		const original = [...cache];
		
		resizeLRUCache(cache, 2);
		
		expect(cache).toEqual(original);
	});
});

describe('LRU cache integration scenarios', () => {
	it('should maintain proper LRU order through multiple operations', () => {
		let cache: string[] = [];
		
		// Add items
		cache = addToLRUCache(cache, 'A', 3);
		cache = addToLRUCache(cache, 'B', 3);
		cache = addToLRUCache(cache, 'C', 3);
		expect(cache).toEqual(['C', 'B', 'A']);
		
		// Add fourth item (A should be evicted)
		cache = addToLRUCache(cache, 'D', 3);
		expect(cache).toEqual(['D', 'C', 'B']);
		expect(isInLRUCache(cache, 'A')).toBe(false);
		
		// Access B (move to front)
		cache = addToLRUCache(cache, 'B', 3);
		expect(cache).toEqual(['B', 'D', 'C']);
		
		// Add E (C should be evicted)
		cache = addToLRUCache(cache, 'E', 3);
		expect(cache).toEqual(['E', 'B', 'D']);
	});

	it('should handle frequent accesses of same item', () => {
		let cache: string[] = [];
		
		cache = addToLRUCache(cache, 'A', 3);
		cache = addToLRUCache(cache, 'B', 3);
		cache = addToLRUCache(cache, 'A', 3); // Access A again
		cache = addToLRUCache(cache, 'A', 3); // Access A again
		cache = addToLRUCache(cache, 'C', 3);
		
		expect(cache).toEqual(['C', 'A', 'B']);
	});

	it('should correctly handle resize during operation', () => {
		let cache = ['item1', 'item2', 'item3', 'item4', 'item5'];
		
		// Resize to smaller
		cache = resizeLRUCache(cache, 3);
		expect(cache).toEqual(['item1', 'item2', 'item3']);
		
		// Add new item
		cache = addToLRUCache(cache, 'item6', 3);
		expect(cache).toEqual(['item6', 'item1', 'item2']);
		
		// Resize to larger
		cache = resizeLRUCache(cache, 5);
		cache = addToLRUCache(cache, 'item7', 5);
		cache = addToLRUCache(cache, 'item8', 5);
		expect(cache).toEqual(['item8', 'item7', 'item6', 'item1', 'item2']);
	});
});
