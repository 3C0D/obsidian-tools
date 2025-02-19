import { Plugin } from "obsidian";
import { registerOutOfVault } from "./move out from vault/move-out-menus.ts";
import { registerSFD } from "./search from directory/search-from-directory.ts";
import { ToolsSettingTab } from "./settings.ts";
import { DEFAULT_SETTINGS } from "./types/variables.ts";
import { showVaultChooserModal } from "./utils.ts";
import type { ToolsSettings } from "obsidian-typings";
import { registerVaultContextMenu } from "./vaultContextMenu.ts";


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

		if (this.settings['move-to-vault']) {
			addImportToVault.call(this, this.app);
		}

		if (this.settings['search-from-directory']) {
			registerSFD.call(this, this.app);
		}
		if (this.settings['vault-context-menu']) {
			this.app.workspace.onLayoutReady(registerVaultContextMenu.bind(this));
		}
	}

	private registerPluginCommands() {
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
	}
}