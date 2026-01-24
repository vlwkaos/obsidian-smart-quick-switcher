/**
 * Utility functions for handling modifier key actions in the modal
 * Pure functions with no Obsidian API dependencies - fully testable
 */

export enum ModifierAction {
	OPEN_NORMAL = 'open-normal',
	CREATE_NOTE = 'create-note',
	OPEN_NEW_PANE = 'open-new-pane',      // Future: Cmd+Enter
	OPEN_NEW_WINDOW = 'open-new-window'   // Future: Ctrl+Enter
}

export interface ModifierKeyConfig {
	shiftKey: boolean;
	ctrlKey: boolean;
	metaKey: boolean;
	altKey: boolean;
}

/**
 * Determine action based on modifier keys pressed
 * 
 * Logic:
 * - Shift+Enter with NO selection → Create new note
 * - Shift+Enter WITH selection → Open normally (ignore shift)
 * - Enter (no modifiers) → Open normally
 * - Other modifiers → Open normally (reserved for future use)
 * 
 * @param modifiers - Extracted keyboard event modifiers
 * @param hasSelection - Whether user has selected a file (vs empty/no match)
 * @returns Action to perform
 */
export function getModifierAction(
	modifiers: ModifierKeyConfig,
	hasSelection: boolean
): ModifierAction {
	// Shift+Enter: Create new note ONLY if no selection
	// If Ctrl or Meta also pressed, treat as normal (disable shift)
	if (modifiers.shiftKey && !modifiers.ctrlKey && !modifiers.metaKey) {
		return hasSelection 
			? ModifierAction.OPEN_NORMAL   // Has selection: open it normally (ignore shift)
			: ModifierAction.CREATE_NOTE;  // No selection: create new note
	}
	
	// Future: Cmd+Enter for new pane
	// if (modifiers.metaKey && hasSelection) {
	//   return ModifierAction.OPEN_NEW_PANE;
	// }
	
	// Default: Open normally (if has selection)
	return ModifierAction.OPEN_NORMAL;
}

/**
 * Extract modifier key state from keyboard or mouse event
 * 
 * @param evt - Keyboard or mouse event from Obsidian modal
 * @returns Object with modifier key states
 */
export function extractModifiers(evt: KeyboardEvent | MouseEvent): ModifierKeyConfig {
	return {
		shiftKey: evt.shiftKey,
		ctrlKey: evt.ctrlKey,
		metaKey: evt.metaKey,
		altKey: evt.altKey
	};
}
