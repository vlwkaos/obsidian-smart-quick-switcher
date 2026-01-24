import { describe, it, expect } from 'vitest';
import { 
	getModifierAction, 
	extractModifiers, 
	ModifierAction,
	ModifierKeyConfig 
} from './modifierKeyUtils';

describe('modifierKeyUtils', () => {
	describe('getModifierAction', () => {
		describe('Shift key with NO selection', () => {
			it('returns CREATE_NOTE when shift pressed and no selection', () => {
				const modifiers: ModifierKeyConfig = { 
					shiftKey: true, 
					ctrlKey: false, 
					metaKey: false, 
					altKey: false 
				};
				expect(getModifierAction(modifiers, false)).toBe(ModifierAction.CREATE_NOTE);
			});
			
			it('returns CREATE_NOTE when only shift pressed (no other modifiers)', () => {
				const modifiers: ModifierKeyConfig = { 
					shiftKey: true, 
					ctrlKey: false, 
					metaKey: false, 
					altKey: false 
				};
				expect(getModifierAction(modifiers, false)).toBe(ModifierAction.CREATE_NOTE);
			});
		});
		
		describe('Shift key WITH selection', () => {
			it('returns OPEN_NORMAL when shift pressed WITH selection (ignores shift)', () => {
				const modifiers: ModifierKeyConfig = { 
					shiftKey: true, 
					ctrlKey: false, 
					metaKey: false, 
					altKey: false 
				};
				expect(getModifierAction(modifiers, true)).toBe(ModifierAction.OPEN_NORMAL);
			});
		});
		
		describe('No modifier behavior', () => {
			it('returns OPEN_NORMAL when no modifiers and has selection', () => {
				const modifiers: ModifierKeyConfig = { 
					shiftKey: false, 
					ctrlKey: false, 
					metaKey: false, 
					altKey: false 
				};
				expect(getModifierAction(modifiers, true)).toBe(ModifierAction.OPEN_NORMAL);
			});
			
			it('returns OPEN_NORMAL when no modifiers and no selection', () => {
				const modifiers: ModifierKeyConfig = { 
					shiftKey: false, 
					ctrlKey: false, 
					metaKey: false, 
					altKey: false 
				};
				expect(getModifierAction(modifiers, false)).toBe(ModifierAction.OPEN_NORMAL);
			});
		});
		
		describe('Future modifiers (currently ignored)', () => {
			it('returns OPEN_NORMAL for Cmd+Enter with selection', () => {
				const modifiers: ModifierKeyConfig = { 
					shiftKey: false, 
					ctrlKey: false, 
					metaKey: true, 
					altKey: false 
				};
				expect(getModifierAction(modifiers, true)).toBe(ModifierAction.OPEN_NORMAL);
			});
			
			it('returns OPEN_NORMAL for Ctrl+Enter with selection', () => {
				const modifiers: ModifierKeyConfig = { 
					shiftKey: false, 
					ctrlKey: true, 
					metaKey: false, 
					altKey: false 
				};
				expect(getModifierAction(modifiers, true)).toBe(ModifierAction.OPEN_NORMAL);
			});
		});
		
		describe('Edge cases', () => {
			it('handles all modifiers false with no selection', () => {
				const modifiers: ModifierKeyConfig = { 
					shiftKey: false, 
					ctrlKey: false, 
					metaKey: false, 
					altKey: false 
				};
				expect(getModifierAction(modifiers, false)).toBe(ModifierAction.OPEN_NORMAL);
			});
			
			it('prioritizes "has selection" over shift key', () => {
				// When shift+cmd pressed WITH selection: open (ignore shift)
				const modifiers: ModifierKeyConfig = { 
					shiftKey: true, 
					ctrlKey: false, 
					metaKey: true, 
					altKey: false 
				};
				expect(getModifierAction(modifiers, true)).toBe(ModifierAction.OPEN_NORMAL);
			});
			
			it('shift+ctrl with no selection returns OPEN_NORMAL (ctrl disables shift)', () => {
				const modifiers: ModifierKeyConfig = { 
					shiftKey: true, 
					ctrlKey: true, 
					metaKey: false, 
					altKey: false 
				};
				expect(getModifierAction(modifiers, false)).toBe(ModifierAction.OPEN_NORMAL);
			});
			
			it('shift+meta with selection returns OPEN_NORMAL', () => {
				const modifiers: ModifierKeyConfig = { 
					shiftKey: true, 
					ctrlKey: false, 
					metaKey: true, 
					altKey: false 
				};
				expect(getModifierAction(modifiers, true)).toBe(ModifierAction.OPEN_NORMAL);
			});
		});
		
		describe('Integration scenarios', () => {
			it('complete flow: no modifiers + selection → open', () => {
				const modifiers: ModifierKeyConfig = { 
					shiftKey: false, 
					ctrlKey: false, 
					metaKey: false, 
					altKey: false 
				};
				expect(getModifierAction(modifiers, true)).toBe(ModifierAction.OPEN_NORMAL);
			});
			
			it('complete flow: shift + no selection → create', () => {
				const modifiers: ModifierKeyConfig = { 
					shiftKey: true, 
					ctrlKey: false, 
					metaKey: false, 
					altKey: false 
				};
				expect(getModifierAction(modifiers, false)).toBe(ModifierAction.CREATE_NOTE);
			});
			
			it('complete flow: shift + selection → open (ignore shift)', () => {
				const modifiers: ModifierKeyConfig = { 
					shiftKey: true, 
					ctrlKey: false, 
					metaKey: false, 
					altKey: false 
				};
				expect(getModifierAction(modifiers, true)).toBe(ModifierAction.OPEN_NORMAL);
			});
			
			it('complete flow: empty modifiers + no selection → open', () => {
				const modifiers: ModifierKeyConfig = { 
					shiftKey: false, 
					ctrlKey: false, 
					metaKey: false, 
					altKey: false 
				};
				expect(getModifierAction(modifiers, false)).toBe(ModifierAction.OPEN_NORMAL);
			});
		});
	});
	
	describe('extractModifiers', () => {
		it('extracts all modifier keys from KeyboardEvent', () => {
			const evt = {
				shiftKey: true,
				ctrlKey: false,
				metaKey: true,
				altKey: false
			} as KeyboardEvent;
			
			const result = extractModifiers(evt);
			
			expect(result.shiftKey).toBe(true);
			expect(result.ctrlKey).toBe(false);
			expect(result.metaKey).toBe(true);
			expect(result.altKey).toBe(false);
		});
		
		it('extracts all modifier keys from MouseEvent', () => {
			const evt = {
				shiftKey: false,
				ctrlKey: true,
				metaKey: false,
				altKey: true
			} as MouseEvent;
			
			const result = extractModifiers(evt);
			
			expect(result.shiftKey).toBe(false);
			expect(result.ctrlKey).toBe(true);
			expect(result.metaKey).toBe(false);
			expect(result.altKey).toBe(true);
		});
		
		it('returns all false for event with no modifiers', () => {
			const evt = {
				shiftKey: false,
				ctrlKey: false,
				metaKey: false,
				altKey: false
			} as KeyboardEvent;
			
			const result = extractModifiers(evt);
			
			expect(result.shiftKey).toBe(false);
			expect(result.ctrlKey).toBe(false);
			expect(result.metaKey).toBe(false);
			expect(result.altKey).toBe(false);
		});
	});
});
