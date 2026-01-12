import 'obsidian-typings';

declare module 'obsidian-typings' {

	interface WorkspacesPluginInstance {
		workspaces: Record<string, any>;
		/**
		 * This value is set to a key of {@link workspaces}
		 */
		activeWorkspace: string;
		setActiveWorkspace: (workspaceName: string) => void
	}
}
