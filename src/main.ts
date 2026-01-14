import { Notice, Plugin } from 'obsidian';
import { WorkspacesPluginInstance } from 'obsidian-typings';
import { SmartQuickSwitcherSettings, DEFAULT_SETTINGS, SearchRule, createDefaultRule } from './types';
import { RecentFilesTracker } from './RecentFilesTracker';
import { LinkAnalyzer } from './LinkAnalyzer';
import { PropertyFilterEngine } from './PropertyFilterEngine';
import { SearchEngine } from './SearchEngine';
import { SmartQuickSwitcherModal } from './SmartQuickSwitcherModal';
import { SmartQuickSwitcherSettingTab } from './SettingsTab';

export default class SmartQuickSwitcherPlugin extends Plugin {
	public settings: SmartQuickSwitcherSettings;
	private recentFiles: RecentFilesTracker;
	private linkAnalyzer: LinkAnalyzer;
	private propertyFilter: PropertyFilterEngine;
	private searchEngine: SearchEngine;
	private previousActiveWorkspace: string | null = null;

	async onload() {
		await this.loadSettings();

		// Initialize components
		this.recentFiles = new RecentFilesTracker(this.app, this.settings.maxRecentFiles);
		this.linkAnalyzer = new LinkAnalyzer(this.app);
		this.propertyFilter = new PropertyFilterEngine(this.app);
		this.searchEngine = new SearchEngine(
			this.app,
			this.linkAnalyzer,
			this.propertyFilter,
			this.recentFiles
		);

		// Register file-open event for recent files tracking
		this.recentFiles.registerEvents();

		// Add settings tab
		this.addSettingTab(new SmartQuickSwitcherSettingTab(this.app, this));

		// Register commands for each rule
		this.registerCommands();

		// Watch for workspace changes
		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				this.handleWorkspaceChange();
			})
		);

		console.log('Smart Quick Switcher plugin loaded');
	}

	onunload() {
		console.log('Smart Quick Switcher plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		
		// Migrate old rules to include new fields
		let needsSave = false;
		for (const rule of this.settings.rules) {
			// Migrate excludedPaths field
			if (!rule.excludedPaths) {
				rule.excludedPaths = [];
				needsSave = true;
			}
			
			// Migrate showNonFiltered + fallbackToAll to extendSearchResult
			if ((rule as any).showNonFiltered !== undefined || (rule as any).fallbackToAll !== undefined) {
				// If either was true, enable extendSearchResult
				rule.extendSearchResult = (rule as any).showNonFiltered || (rule as any).fallbackToAll;
				delete (rule as any).showNonFiltered;
				delete (rule as any).fallbackToAll;
				needsSave = true;
			}
			
			// Migrate filterRelatedFiles field
			if (rule.filterRelatedFiles === undefined) {
				rule.filterRelatedFiles = false;  // Default: show all related files
				needsSave = true;
			}
			
			// Migrate outgoingLinks field
			if (!rule.outgoingLinks) {
				rule.outgoingLinks = { enabled: true, priority: 2 };
				
				// Shift existing priorities down to make room
				if (rule.backlinks.priority >= 2) {
					rule.backlinks.priority++;
				}
				if (rule.twoHopLinks.priority >= 2) {
					rule.twoHopLinks.priority++;
				}
				
				needsSave = true;
			}
			
			// Migrate ignoreFilters field for recentFiles
			if (rule.recentFiles.ignoreFilters === undefined) {
				rule.recentFiles.ignoreFilters = true;  // Default to true
				needsSave = true;
			}
		}
		
		if (needsSave) {
			await this.saveSettings();
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
		
		// Update recent files limit if changed
		if (this.recentFiles) {
			this.recentFiles.setMaxRecent(this.settings.maxRecentFiles);
		}
		
		// Re-register commands when rules change
		this.registerCommands();
	}

	/**
	 * Register a command for each search rule
	 */
	private registerCommands() {
		// Remove existing commands
		const commandIds = this.getCommandIds();
		const appCommands = (this.app as any).commands;
		if (appCommands) {
			for (const id of commandIds) {
				appCommands.removeCommand(id);
			}
		}

		// Add workspace-aware command
		this.addCommand({
			id: 'open-smart-quick-switcher-workspace',
			name: 'Open (workspace default)',
			callback: () => {
				const rule = this.getActiveRuleForWorkspace();
				if (rule) {
					this.openSwitcher(rule);
				} else {
					// Fallback: use first rule if available
					if (this.settings.rules.length > 0) {
						this.openSwitcher(this.settings.rules[0]);
					} else {
						new Notice('No search rules configured');
					}
				}
			}
		});

		// Add command for each rule
		for (const rule of this.settings.rules) {
			this.addCommand({
				id: `open-smart-quick-switcher-${rule.id}`,
				name: `Open: ${rule.name}`,
				callback: () => {
					this.openSwitcher(rule);
				}
			});
		}
	}

	/**
	 * Get all command IDs for this plugin
	 */
	private getCommandIds(): string[] {
		const prefix = `${this.manifest.id}:`;
		const commands = (this.app as any).commands?.commands;
		if (!commands) {
			return [];
		}
		// Get all commands that start with our plugin ID
		return Object.keys(commands).filter(id => 
			id.startsWith(prefix) && 
			(id.includes('open-smart-quick-switcher-') || id === `${prefix}open-smart-quick-switcher-workspace`)
		);
	}

	/**
	 * Open the smart quick switcher modal with a specific rule
	 */
	private openSwitcher(rule: SearchRule) {
		const modal = new SmartQuickSwitcherModal(
			this.app,
			this.searchEngine,
			rule,
			this.settings.showDirectory,
			this.settings.maxSuggestions
		);
		modal.open();
	}

	/**
	 * Get active search rule for current workspace
	 */
	public getActiveRuleForWorkspace(): SearchRule | null {
		const workspacesPlugin = this.getWorkspacesPlugin();
		if (!workspacesPlugin) {
			return null;
		}

		const workspaceName = workspacesPlugin.activeWorkspace;
		const ruleIds = this.settings.workspaceRules[workspaceName] || [];
		
		if (ruleIds.length === 0) {
			return null;
		}

		// Return the first active rule for this workspace
		const ruleId = ruleIds[0];
		return this.settings.rules.find(r => r.id === ruleId) || null;
	}

	/**
	 * Handle workspace change
	 */
	private handleWorkspaceChange() {
		const workspacesPlugin = this.getWorkspacesPlugin();
		if (!workspacesPlugin) {
			return;
		}

		const currentWorkspace = workspacesPlugin.activeWorkspace;
		
		if (currentWorkspace !== this.previousActiveWorkspace) {
			this.previousActiveWorkspace = currentWorkspace;
			// Workspace changed - you could trigger actions here if needed
		}
	}

	/**
	 * Get the Workspaces core plugin
	 */
	public getWorkspacesPlugin(): WorkspacesPluginInstance | null {
		const internalPlugins = (this.app as any).internalPlugins;
		if (!internalPlugins) {
			return null;
		}
		const workspacesPlugin = internalPlugins.getEnabledPluginById('workspaces');
		if (!workspacesPlugin) {
			return null;
		}
		return workspacesPlugin;
	}

	/**
	 * Create a new rule
	 */
	public createRule(): SearchRule {
		const rule = createDefaultRule();
		this.settings.rules.push(rule);
		return rule;
	}

	/**
	 * Delete a rule
	 */
	public deleteRule(ruleId: string) {
		this.settings.rules = this.settings.rules.filter(r => r.id !== ruleId);
		
		// Remove from workspace rules
		for (const workspace in this.settings.workspaceRules) {
			this.settings.workspaceRules[workspace] = this.settings.workspaceRules[workspace]
				.filter(id => id !== ruleId);
		}
	}
}
