import { describe, it, expect } from 'vitest';
import {
	compareValues,
	containsValue,
	passesPropertyFilter,
	passesAllPropertyFilters
} from './propertyFilterUtils';
import { PropertyFilter } from '../types';

describe('compareValues', () => {
	describe('exactMatch = true', () => {
		it('should return true for exact string matches (case insensitive)', () => {
			expect(compareValues('hello', 'hello', true)).toBe(true);
			expect(compareValues('Hello', 'hello', true)).toBe(true);
			expect(compareValues('HELLO', 'hello', true)).toBe(true);
		});

		it('should return false for non-exact string matches', () => {
			expect(compareValues('hello world', 'hello', true)).toBe(false);
			expect(compareValues('hello', 'hello world', true)).toBe(false);
		});

		it('should handle number values', () => {
			expect(compareValues(42, '42', true)).toBe(true);
			expect(compareValues(42, '43', true)).toBe(false);
		});

		it('should handle boolean values', () => {
			expect(compareValues(true, 'true', true)).toBe(true);
			expect(compareValues(false, 'false', true)).toBe(true);
			expect(compareValues(true, 'false', true)).toBe(false);
		});

		it('should handle array values', () => {
			expect(compareValues(['tag1', 'tag2'], 'tag1', true)).toBe(true);
			expect(compareValues(['tag1', 'tag2'], 'tag2', true)).toBe(true);
			expect(compareValues(['tag1', 'tag2'], 'tag3', true)).toBe(false);
		});

		it('should return false for null/undefined values', () => {
			expect(compareValues(null, 'test', true)).toBe(false);
			expect(compareValues(undefined, 'test', true)).toBe(false);
		});
	});

	describe('exactMatch = false', () => {
		it('should return true for substring matches', () => {
			expect(compareValues('hello world', 'hello', false)).toBe(true);
			expect(compareValues('hello world', 'world', false)).toBe(true);
			expect(compareValues('hello world', 'lo wo', false)).toBe(true);
		});

		it('should return false for non-matching substrings', () => {
			expect(compareValues('hello', 'goodbye', false)).toBe(false);
		});

		it('should handle array values', () => {
			expect(compareValues(['hello world', 'foo'], 'world', false)).toBe(true);
			expect(compareValues(['hello', 'foo'], 'bar', false)).toBe(false);
		});
	});
});

describe('containsValue', () => {
	it('should return true for substring matches', () => {
		expect(containsValue('hello world', 'hello')).toBe(true);
		expect(containsValue('hello world', 'world')).toBe(true);
		expect(containsValue('hello world', 'lo wo')).toBe(true);
	});

	it('should be case insensitive', () => {
		expect(containsValue('Hello World', 'hello')).toBe(true);
		expect(containsValue('hello world', 'WORLD')).toBe(true);
	});

	it('should handle array values', () => {
		expect(containsValue(['hello world', 'foo bar'], 'world')).toBe(true);
		expect(containsValue(['hello world', 'foo bar'], 'foo')).toBe(true);
		expect(containsValue(['hello', 'world'], 'goodbye')).toBe(false);
	});

	it('should handle number values', () => {
		expect(containsValue(12345, '123')).toBe(true);
		expect(containsValue(12345, '345')).toBe(true);
		expect(containsValue(12345, '678')).toBe(false);
	});

	it('should return false for null/undefined values', () => {
		expect(containsValue(null, 'test')).toBe(false);
		expect(containsValue(undefined, 'test')).toBe(false);
	});

	it('should handle empty strings', () => {
		expect(containsValue('hello', '')).toBe(true); // Empty string is contained in any string
		expect(containsValue('', 'hello')).toBe(false);
	});
});

describe('passesPropertyFilter', () => {
	describe('exists operator', () => {
		it('should return true if property exists', () => {
			const filter: PropertyFilter = {
				propertyKey: 'status',
				operator: 'exists',
				value: ''
			};
			expect(passesPropertyFilter({ status: 'active' }, filter)).toBe(true);
			// Property exists even if value is null (key is present)
			expect(passesPropertyFilter({ status: null }, filter)).toBe(true);
			expect(passesPropertyFilter({ status: undefined }, filter)).toBe(false);
		});

		it('should return false if property does not exist', () => {
			const filter: PropertyFilter = {
				propertyKey: 'status',
				operator: 'exists',
				value: ''
			};
			expect(passesPropertyFilter({}, filter)).toBe(false);
			expect(passesPropertyFilter(null, filter)).toBe(false);
		});
	});

	describe('not-exists operator', () => {
		it('should return true if property does not exist', () => {
			const filter: PropertyFilter = {
				propertyKey: 'status',
				operator: 'not-exists',
				value: ''
			};
			expect(passesPropertyFilter({}, filter)).toBe(true);
			expect(passesPropertyFilter(null, filter)).toBe(true);
			expect(passesPropertyFilter({ other: 'value' }, filter)).toBe(true);
		});

		it('should return false if property exists', () => {
			const filter: PropertyFilter = {
				propertyKey: 'status',
				operator: 'not-exists',
				value: ''
			};
			expect(passesPropertyFilter({ status: 'active' }, filter)).toBe(false);
		});
	});

	describe('equals operator', () => {
		it('should return true for exact matches', () => {
			const filter: PropertyFilter = {
				propertyKey: 'status',
				operator: 'equals',
				value: 'active'
			};
			expect(passesPropertyFilter({ status: 'active' }, filter)).toBe(true);
			expect(passesPropertyFilter({ status: 'Active' }, filter)).toBe(true);
		});

		it('should return false for non-matches', () => {
			const filter: PropertyFilter = {
				propertyKey: 'status',
				operator: 'equals',
				value: 'active'
			};
			expect(passesPropertyFilter({ status: 'inactive' }, filter)).toBe(false);
			expect(passesPropertyFilter({}, filter)).toBe(false);
		});

		it('should handle arrays', () => {
			const filter: PropertyFilter = {
				propertyKey: 'tags',
				operator: 'equals',
				value: 'work'
			};
			expect(passesPropertyFilter({ tags: ['work', 'important'] }, filter)).toBe(true);
			expect(passesPropertyFilter({ tags: ['personal'] }, filter)).toBe(false);
		});
	});

	describe('not-equals operator', () => {
		it('should return true for non-matches', () => {
			const filter: PropertyFilter = {
				propertyKey: 'status',
				operator: 'not-equals',
				value: 'active'
			};
			expect(passesPropertyFilter({ status: 'inactive' }, filter)).toBe(true);
		});

		it('should return false for matches', () => {
			const filter: PropertyFilter = {
				propertyKey: 'status',
				operator: 'not-equals',
				value: 'active'
			};
			expect(passesPropertyFilter({ status: 'active' }, filter)).toBe(false);
		});

		it('should return false for missing properties (undefined != value)', () => {
			const filter: PropertyFilter = {
				propertyKey: 'status',
				operator: 'not-equals',
				value: 'active'
			};
			// Missing property doesn't pass "not-equals" - use "not-exists" instead
			expect(passesPropertyFilter({}, filter)).toBe(false);
		});
	});

	describe('contains operator', () => {
		it('should return true for substring matches', () => {
			const filter: PropertyFilter = {
				propertyKey: 'title',
				operator: 'contains',
				value: 'meeting'
			};
			expect(passesPropertyFilter({ title: 'Team meeting notes' }, filter)).toBe(true);
		});

		it('should return false for non-matches', () => {
			const filter: PropertyFilter = {
				propertyKey: 'title',
				operator: 'contains',
				value: 'meeting'
			};
			expect(passesPropertyFilter({ title: 'Project plan' }, filter)).toBe(false);
		});

		it('should handle arrays', () => {
			const filter: PropertyFilter = {
				propertyKey: 'tags',
				operator: 'contains',
				value: 'work'
			};
			expect(passesPropertyFilter({ tags: ['work-project', 'important'] }, filter)).toBe(true);
			expect(passesPropertyFilter({ tags: ['personal'] }, filter)).toBe(false);
		});
	});

	describe('edge cases', () => {
		it('should handle no frontmatter', () => {
			const existsFilter: PropertyFilter = {
				propertyKey: 'status',
				operator: 'exists',
				value: ''
			};
			const notExistsFilter: PropertyFilter = {
				propertyKey: 'status',
				operator: 'not-exists',
				value: ''
			};

			expect(passesPropertyFilter(null, existsFilter)).toBe(false);
			expect(passesPropertyFilter(null, notExistsFilter)).toBe(true);
			expect(passesPropertyFilter(undefined, existsFilter)).toBe(false);
			expect(passesPropertyFilter(undefined, notExistsFilter)).toBe(true);
		});

		it('should handle empty arrays', () => {
			const filter: PropertyFilter = {
				propertyKey: 'tags',
				operator: 'equals',
				value: 'test'
			};
			expect(passesPropertyFilter({ tags: [] }, filter)).toBe(false);
		});
	});
});

describe('passesAllPropertyFilters', () => {
	it('should return true if no filters provided', () => {
		expect(passesAllPropertyFilters({ status: 'active' }, [])).toBe(true);
		expect(passesAllPropertyFilters(null, [])).toBe(true);
	});

	it('should return true if all filters pass (AND logic)', () => {
		const filters: PropertyFilter[] = [
			{ propertyKey: 'status', operator: 'equals', value: 'active' },
			{ propertyKey: 'priority', operator: 'equals', value: 'high' },
			{ propertyKey: 'tags', operator: 'contains', value: 'work' }
		];

		const frontmatter = {
			status: 'active',
			priority: 'high',
			tags: ['work-project', 'important']
		};

		expect(passesAllPropertyFilters(frontmatter, filters)).toBe(true);
	});

	it('should return false if any filter fails', () => {
		const filters: PropertyFilter[] = [
			{ propertyKey: 'status', operator: 'equals', value: 'active' },
			{ propertyKey: 'priority', operator: 'equals', value: 'high' }
		];

		const frontmatter = {
			status: 'active',
			priority: 'low' // This doesn't match
		};

		expect(passesAllPropertyFilters(frontmatter, filters)).toBe(false);
	});

	it('should handle complex combinations', () => {
		const filters: PropertyFilter[] = [
			{ propertyKey: 'draft', operator: 'not-exists', value: '' },
			{ propertyKey: 'status', operator: 'not-equals', value: 'archived' },
			{ propertyKey: 'tags', operator: 'contains', value: 'active' }
		];

		const frontmatter1 = {
			status: 'published',
			tags: ['active-project', 'work']
		};
		expect(passesAllPropertyFilters(frontmatter1, filters)).toBe(true);

		const frontmatter2 = {
			draft: true,
			status: 'published',
			tags: ['active-project']
		};
		expect(passesAllPropertyFilters(frontmatter2, filters)).toBe(false);

		const frontmatter3 = {
			status: 'archived',
			tags: ['active-project']
		};
		expect(passesAllPropertyFilters(frontmatter3, filters)).toBe(false);
	});
});
