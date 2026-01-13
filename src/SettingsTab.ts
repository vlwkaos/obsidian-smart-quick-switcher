import { App, PluginSettingTab, Setting } from 'obsidian';
import SmartQuickSwitcherPlugin from './main';
import { SearchRule, PropertyFilter, createDefaultRule } from './types';

export class SmartQuickSwitcherSettingTab extends PluginSettingTab {
	plugin: SmartQuickSwitcherPlugin;
	private expandedRules: Set<string> = new Set();

	constructor(app: App, plugin: SmartQuickSwitcherPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Smart Quick Switcher Settings' });

		// General Settings
		this.renderGeneralSettings(containerEl);

		// Search Rules
		this.renderSearchRules(containerEl);

		// Workspace Rules
		this.renderWorkspaceRules(containerEl);
	}

	private renderGeneralSettings(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'General Settings' });

		new Setting(containerEl)
			.setName('Max suggestions')
			.setDesc('Maximum number of files to show in search results')
			.addText(text => text
				.setPlaceholder('50')
				.setValue(String(this.plugin.settings.maxSuggestions))
				.onChange(async (value) => {
					const num = parseInt(value);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.maxSuggestions = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Show directory path')
			.setDesc('Show the directory path for each file in search results')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showDirectory)
				.onChange(async (value) => {
					this.plugin.settings.showDirectory = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Recent files limit')
			.setDesc('Maximum number of recently opened files to track (LRU cache)')
			.addText(text => text
				.setPlaceholder('4')
				.setValue(String(this.plugin.settings.maxRecentFiles))
				.onChange(async (value) => {
					const num = parseInt(value);
					if (!isNaN(num) && num > 0 && num <= 50) {
						this.plugin.settings.maxRecentFiles = num;
						await this.plugin.saveSettings();
					}
				}));
	}

	private renderSearchRules(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Search Rules' });

		const rulesContainer = containerEl.createDiv();

		for (const rule of this.plugin.settings.rules) {
			this.renderRule(rulesContainer, rule);
		}

		new Setting(containerEl)
			.addButton(button => button
				.setButtonText('Add New Rule')
				.setCta()
				.onClick(async () => {
					const newRule = this.plugin.createRule();
					this.expandedRules.add(newRule.id);
					await this.plugin.saveSettings();
					this.display();
				}));
	}

	private renderRule(containerEl: HTMLElement, rule: SearchRule): void {
		const ruleEl = containerEl.createDiv({ cls: 'smart-quick-switcher-rule' });
		const isExpanded = this.expandedRules.has(rule.id);

		// Rule header - always visible
		const headerSetting = new Setting(ruleEl)
			.setName(rule.name || 'Unnamed Rule')
			.setClass('smart-quick-switcher-rule-header')
			.addExtraButton(button => button
				.setIcon(isExpanded ? 'chevron-down' : 'chevron-right')
				.setTooltip(isExpanded ? 'Collapse' : 'Expand')
				.onClick(() => {
					if (isExpanded) {
						this.expandedRules.delete(rule.id);
					} else {
						this.expandedRules.add(rule.id);
					}
					this.display();
				}))
			.addButton(button => button
				.setButtonText('Delete')
				.setWarning()
				.onClick(async () => {
					this.plugin.deleteRule(rule.id);
					this.expandedRules.delete(rule.id);
					await this.plugin.saveSettings();
					this.display();
				}));

		// Only show details if expanded
		if (!isExpanded) {
			return;
		}

		const detailsEl = ruleEl.createDiv({ cls: 'smart-quick-switcher-rule-details' });

		// Rule Name
		new Setting(detailsEl)
			.setName('Rule name')
			.addText(text => text
				.setPlaceholder('Enter rule name')
				.setValue(rule.name)
				.onChange(async (value) => {
					rule.name = value;
					await this.plugin.saveSettings();
					// Update header text without re-rendering entire UI
					const headerNameEl = headerSetting.nameEl;
					if (headerNameEl) {
						headerNameEl.setText(value || 'Unnamed Rule');
					}
				}));

		// Property Filters
		detailsEl.createEl('h4', { text: 'Property Filters' });
		this.renderPropertyFilters(detailsEl, rule);

		// Search Options
		detailsEl.createEl('h4', { text: 'Search Options' });
		this.renderSearchOptions(detailsEl, rule);

		// Result Group Priorities
		detailsEl.createEl('h4', { text: 'Result Group Priorities' });
		this.renderGroupPriorities(detailsEl, rule);

		// Filter Bypass Options
		detailsEl.createEl('h4', { text: 'Filter Bypass Options' });
		
		new Setting(detailsEl)
			.setName('Recent files ignore property filters')
			.setDesc('Show recent files in empty query view even if they don\'t match property filters')
			.addToggle(toggle => toggle
				.setValue(rule.recentFiles.ignoreFilters ?? true)
				.onChange(async (value) => {
					rule.recentFiles.ignoreFilters = value;
					await this.plugin.saveSettings();
				}));

		new Setting(detailsEl)
			.setName('Show non-filtered results')
			.setDesc('Show matching files outside the filter alongside filtered results (dimmed, labeled [all])')
			.addToggle(toggle => toggle
				.setValue(rule.showNonFiltered ?? true)
				.onChange(async (value) => {
					rule.showNonFiltered = value;
					await this.plugin.saveSettings();
				}));

		new Setting(detailsEl)
			.setName('Fallback to all files')
			.setDesc('When no results match during search, search all files without filters')
			.addToggle(toggle => toggle
				.setValue(rule.fallbackToAll)
				.onChange(async (value) => {
					rule.fallbackToAll = value;
					await this.plugin.saveSettings();
				}));
	}

	private renderPropertyFilters(containerEl: HTMLElement, rule: SearchRule): void {
		const filtersContainer = containerEl.createDiv();

		// Show existing filters
		for (const filter of rule.propertyFilters) {
			this.renderPropertyFilter(filtersContainer, rule, filter);
		}

		// Add new filter UI
		const addContainer = filtersContainer.createDiv({ cls: 'setting-item' });
		addContainer.createDiv({ cls: 'setting-item-info' }).createDiv({ cls: 'setting-item-name', text: 'Add filter' });
		
		const controlsContainer = addContainer.createDiv({ cls: 'setting-item-control' });
		
		let propertyKey = '';
		let operator: PropertyFilter['operator'] = 'equals';
		let value = '';

		const keyInput = controlsContainer.createEl('input', {
			type: 'text',
			placeholder: 'Property key',
			attr: { style: 'width: 120px; margin-right: 8px;' }
		});
		keyInput.addEventListener('input', (e) => {
			propertyKey = (e.target as HTMLInputElement).value;
		});

		const operatorSelect = controlsContainer.createEl('select', {
			attr: { style: 'margin-right: 8px;' }
		});
		['equals', 'not-equals', 'contains', 'exists', 'not-exists'].forEach(op => {
			operatorSelect.createEl('option', { text: op, value: op });
		});
		operatorSelect.addEventListener('change', (e) => {
			operator = (e.target as HTMLSelectElement).value as PropertyFilter['operator'];
			valueInput.disabled = operator === 'exists' || operator === 'not-exists';
		});

		const valueInput = controlsContainer.createEl('input', {
			type: 'text',
			placeholder: 'Value',
			attr: { style: 'width: 120px; margin-right: 8px;' }
		});
		valueInput.addEventListener('input', (e) => {
			value = (e.target as HTMLInputElement).value;
		});

		const addButton = controlsContainer.createEl('button', {
			text: 'Add',
			cls: 'mod-cta'
		});
		addButton.addEventListener('click', async () => {
			if (propertyKey) {
				rule.propertyFilters.push({
					propertyKey,
					operator,
					value: operator === 'exists' || operator === 'not-exists' ? '' : value
				});
				await this.plugin.saveSettings();
				this.display();
			}
		});
	}

	private renderPropertyFilter(containerEl: HTMLElement, rule: SearchRule, filter: PropertyFilter): void {
		const filterContainer = containerEl.createDiv({ cls: 'setting-item' });
		
		// Create info section with styled filter display
		const infoDiv = filterContainer.createDiv({ cls: 'setting-item-info' });
		const nameDiv = infoDiv.createDiv({ cls: 'setting-item-name smart-quick-switcher-filter-display' });
		
		// Create styled components
		const keySpan = nameDiv.createSpan({ cls: 'smart-quick-switcher-filter-key', text: filter.propertyKey });
		const operatorSpan = nameDiv.createSpan({ cls: 'smart-quick-switcher-filter-operator', text: filter.operator });
		
		if (filter.operator !== 'exists' && filter.operator !== 'not-exists') {
			const valueSpan = nameDiv.createSpan({ cls: 'smart-quick-switcher-filter-value', text: filter.value });
		}
		
		// Create control section with remove button
		const controlDiv = filterContainer.createDiv({ cls: 'setting-item-control' });
		const removeButton = controlDiv.createEl('button', {
			text: 'Remove',
			cls: 'mod-warning'
		});
		removeButton.addEventListener('click', async () => {
			rule.propertyFilters = rule.propertyFilters.filter(f => f !== filter);
			await this.plugin.saveSettings();
			this.display();
		});
	}

	private renderSearchOptions(containerEl: HTMLElement, rule: SearchRule): void {
		new Setting(containerEl)
			.setName('Fuzzy search')
			.addToggle(toggle => toggle
				.setValue(rule.fuzzySearch)
				.onChange(async (value) => {
					rule.fuzzySearch = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Search in content')
			.addToggle(toggle => toggle
				.setValue(rule.searchInContent)
				.onChange(async (value) => {
					rule.searchInContent = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Search in tags')
			.addToggle(toggle => toggle
				.setValue(rule.searchInTags)
				.onChange(async (value) => {
					rule.searchInTags = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Search in properties')
			.addToggle(toggle => toggle
				.setValue(rule.searchInProperties)
				.onChange(async (value) => {
					rule.searchInProperties = value;
					await this.plugin.saveSettings();
				}));
	}

	/**
	 * Get groups ordered by priority for display
	 */
	private getOrderedGroups(rule: SearchRule): Array<{
		key: keyof SearchRule;
		name: string;
		description: string;
		config: { enabled: boolean; priority: number };
	}> {
		const groups = [
			{ 
				key: 'recentFiles' as keyof SearchRule,
				name: 'Recent files',
				description: 'Recently opened files',
				config: rule.recentFiles 
			},
			{ 
				key: 'outgoingLinks' as keyof SearchRule,
				name: 'Outgoing links',
				description: 'Files that the current file directly links to',
				config: rule.outgoingLinks 
			},
			{ 
				key: 'backlinks' as keyof SearchRule,
				name: 'Backlinks',
				description: 'Files that link to the current file',
				config: rule.backlinks 
			},
			{ 
				key: 'twoHopLinks' as keyof SearchRule,
				name: 'Two-hop links',
				description: 'Files that are exactly 2 links away',
				config: rule.twoHopLinks 
			},
		];
		
		// Sort by priority (lower number = higher priority)
		groups.sort((a, b) => a.config.priority - b.config.priority);
		
		return groups;
	}

	/**
	 * Swap priorities between two groups
	 */
	private async swapGroupPriorities(rule: SearchRule, index1: number, index2: number): Promise<void> {
		const groups = this.getOrderedGroups(rule);
		
		// Swap priorities
		const temp = groups[index1].config.priority;
		groups[index1].config.priority = groups[index2].config.priority;
		groups[index2].config.priority = temp;
		
		await this.plugin.saveSettings();
		this.display(); // Re-render to show new order
	}

	private renderGroupPriorities(containerEl: HTMLElement, rule: SearchRule): void {
		// Add section heading
		containerEl.createEl('p', {
			text: 'Groups at the top are shown first in results. Use arrows to reorder.',
			attr: { style: 'opacity: 0.7; font-size: 0.9em; margin-bottom: 12px;' }
		});
		
		const groups = this.getOrderedGroups(rule);
		
		for (let i = 0; i < groups.length; i++) {
			const group = groups[i];
			const setting = new Setting(containerEl)
				.setName(group.name)
				.setDesc(group.description);
			
			// Up button (disabled if first)
			if (i > 0) {
				setting.addExtraButton(button => button
					.setIcon('arrow-up')
					.setTooltip('Move up (higher priority)')
					.onClick(async () => {
						await this.swapGroupPriorities(rule, i, i - 1);
					}));
			} else {
				// Add disabled placeholder to maintain alignment
				setting.addExtraButton(button => button
					.setIcon('arrow-up')
					.setTooltip('Already at top')
					.setDisabled(true));
			}
			
			// Down button (disabled if last)
			if (i < groups.length - 1) {
				setting.addExtraButton(button => button
					.setIcon('arrow-down')
					.setTooltip('Move down (lower priority)')
					.onClick(async () => {
						await this.swapGroupPriorities(rule, i, i + 1);
					}));
			} else {
				// Add disabled placeholder to maintain alignment
				setting.addExtraButton(button => button
					.setIcon('arrow-down')
					.setTooltip('Already at bottom')
					.setDisabled(true));
			}
			
			// Enable/disable toggle
			setting.addToggle(toggle => toggle
				.setValue(group.config.enabled)
				.onChange(async (value) => {
					group.config.enabled = value;
					await this.plugin.saveSettings();
				}));
		}
		
		containerEl.createEl('small', {
			text: 'Disabled groups maintain their priority and can be re-enabled at any time.',
			attr: { style: 'opacity: 0.7; display: block; margin-top: 8px;' }
		});
	}

	private renderWorkspaceRules(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Workspace Rules' });

		const workspacesPlugin = this.plugin.getWorkspacesPlugin();
		if (!workspacesPlugin) {
			containerEl.createEl('p', {
				text: 'Workspaces plugin not found. Please enable the Workspaces core plugin.',
				attr: { style: 'color: var(--text-muted);' }
			});
			return;
		}

		const workspaces = workspacesPlugin.workspaces;
		if (!workspaces || Object.keys(workspaces).length === 0) {
			containerEl.createEl('p', {
				text: 'No workspaces found. Create a workspace first.',
				attr: { style: 'color: var(--text-muted);' }
			});
			return;
		}

		for (const workspaceName of Object.keys(workspaces)) {
			this.renderWorkspaceRule(containerEl, workspaceName);
		}
	}

	private renderWorkspaceRule(containerEl: HTMLElement, workspaceName: string): void {
		const ruleIds = this.plugin.settings.workspaceRules[workspaceName] || [];

		new Setting(containerEl)
			.setName(`Workspace: ${workspaceName}`)
			.setDesc('Select rule to apply for this workspace')
			.addDropdown(dropdown => {
				dropdown.addOption('', '-- No rule --');
				for (const rule of this.plugin.settings.rules) {
					dropdown.addOption(rule.id, rule.name);
				}
				dropdown.setValue(ruleIds[0] || '');
				dropdown.onChange(async (value) => {
					if (value) {
						this.plugin.settings.workspaceRules[workspaceName] = [value];
					} else {
						delete this.plugin.settings.workspaceRules[workspaceName];
					}
					await this.plugin.saveSettings();
				});
			});
	}
}
