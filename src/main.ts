// todo: copy vault profile. insert in UI

import { Plugin } from "obsidian";
import { ToolsSettingTab } from "./settings";
import { registerSFD } from "./search from directory/search-from-directory";
import { registerOutOfVault } from "./move out from vault/move-out-menus";
import { DEFAULT_SETTINGS } from "./types/variables";
import { ToolsSettings } from "./types/global";
import { addMoveToVault } from "./move to vault/move-to-vault";
import { openVaultChooser } from "./utils";

export default class Tools extends Plugin {
	settings: ToolsSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new ToolsSettingTab(this.app, this));

		this.initializeFeatures();
		this.registerCommands();
	}

	private async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private initializeFeatures() {
		if (this.settings['move-out-from-vault']) {
			registerOutOfVault.call(this, this.app);
		}

		if (this.settings['move-to-vault']) {
			addMoveToVault.call(this, this.app);
		}

		if (this.settings['search-from-directory']) {
			registerSFD.call(this, this.app);
		}
	}

	private registerCommands() {
		this.addCommand({
			id: 'import-vault-profile',
			name: 'Import vault profile',
			callback: () => openVaultChooser.call(this, this.app, true),
		});

		this.addCommand({
			id: 'export-vault-profile',
			name: 'Export vault profile',
			callback: () => openVaultChooser.call(this, this.app, false),
		});
	}
}