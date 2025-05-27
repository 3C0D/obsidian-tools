import { Plugin } from "obsidian";
import { ToolsSettingTab } from "./settings.ts";
import { DEFAULT_SETTINGS } from "./types/variables.ts";
import { showVaultChooserModal } from "./utils.ts";
import type { ToolsSettings } from "obsidian-typings";
import { registerVaultContextMenu } from "./vaultContextMenu.ts";
import { registerOutOfVault } from "./move-ou-from-vault/move-out-menus.ts";
import { addImportToVault } from "./import-to-vault/import-to-vault.ts";
import { registerDeleteFoldersByName } from "./delete-folders-by-name/delete-folders-by-name.ts";
import { registerSearchFolders } from "./search-folders/search-folders.ts";
import { addDeleteEmptyFolders } from "./delete-empty-folders/delete-empty-folders.ts";


export default class Tools extends Plugin {
	settings: ToolsSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new ToolsSettingTab(this.app, this));

		this.initializeFeaturesBasedOnSettings();
		this.registerPluginCommands();
	}

	private async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private initializeFeaturesBasedOnSettings() {
		if (this.settings['move-out-from-vault']) {
			registerOutOfVault.call(this, this.app);
		}

		if (this.settings['import-to-vault']) {
			addImportToVault.call(this, this.app);
		}

		// Search from directory is now native in Obsidian

		if (this.settings['vault-context-menu']) {
			this.app.workspace.onLayoutReady(registerVaultContextMenu.bind(this));
		}

		// Register the delete folders by name command if enabled
		if (this.settings['delete-folders-by-name']) {
			this.addCommand({
				id: 'delete-folders-by-name',
				name: 'Delete folders by name',
				callback: () => registerDeleteFoldersByName(this.app),
			});
		}

		// Register the search folders command if enabled
		if (this.settings['search-folders']) {
			this.addCommand({
				id: 'search-folders',
				name: 'Search folders',
				callback: () => registerSearchFolders(this.app),
			});
		}

		// Register the delete empty folders command if enabled
		if (this.settings['delete-empty-folders']) {
			addDeleteEmptyFolders.call(this, this.app);
		}
	}

	private registerPluginCommands() {
		// Always register these core commands
		this.addCommand({
			id: 'import-vault-profile',
			name: 'Import vault profile',
			callback: () => showVaultChooserModal.call(this, this.app, true),
		});

		this.addCommand({
			id: 'export-vault-profile',
			name: 'Export vault profile',
			callback: () => showVaultChooserModal.call(this, this.app, false),
		});

		// The other commands are registered conditionally in the settings callbacks
		// to allow them to be dynamically added/removed when settings change
	}
}