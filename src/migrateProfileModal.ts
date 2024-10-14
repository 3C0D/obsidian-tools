import * as path from "path";
import * as fs from "fs-extra";
import { App, Modal, Setting } from "obsidian";
import Tools from "./main";
import { ConfirmCallback } from "./types/global";

export async function openMigrateModal(plugin: Tools, app: App, dirPath: string, message: string, isImport: boolean): Promise<boolean> {
    return new Promise((resolve) => {
        new MigrateModal(plugin, app, dirPath, message, resolve, isImport).open();
    });
}

class MigrateModal extends Modal {
    constructor(
        public plugin: Tools,
        app: App,
        public dirPath: string,
        public message: string,
        public callback: ConfirmCallback,
        public isImport: boolean
    ) {
        super(app);
        this.initializeDestinationDirPath();
    }

    private initializeDestinationDirPath() {
        if (!this.isImport) {
            this.dirPath = this.app.vault.adapter.getFullPath('.obsidian');
        }
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: this.message });
        contentEl.createEl('p', { text: '⚠️ Existing items will be replaced. Others will be kept.' });

        await this.updateVaultItemsList(true)
        await this.updateVaultItemsList(false)

        this.createMigrateSettingsSection('Directories', this.plugin.settings.vaultDirs);
        this.createMigrateSettingsSection('Files', this.plugin.settings.vaultFiles);

        await this.plugin.saveSettings()

        new Setting(this.contentEl)
            .addButton((btn) => {
                btn.setButtonText('Confirm')
                    .setCta()
                    .onClick(() => {
                        this.callback(true);
                        this.close();
                    });
            })
            .addButton((btn) =>
                btn.setButtonText('Cancel')
                    .onClick(() => {
                        this.callback(false);
                        this.close();
                    }));
    }

    private createMigrateSettingsSection(title: string, items: Record<string, boolean>): void {
        const sectionEl = this.contentEl.createDiv();
        sectionEl.createEl('h3', { text: title });

        Object.entries(items).forEach(([name, isEnabled]) => {
            const itemPath = path.join(this.dirPath, name + (title === 'Files' ? '.json' : ''));
            if (fs.existsSync(itemPath)) {
                new Setting(sectionEl)
                    .setName(`${this.isImport ? 'Import' : 'Export'} ${name}${name === 'app' ? ' (General settings)' : ''}`)
                    .addToggle((toggle) =>
                        toggle.setValue(isEnabled)
                            .onChange(async (value) => {
                                items[name] = value;
                                await this.plugin.saveSettings();
                            }));
            }
        });
    }

    private async updateVaultItemsList(isDirectory: boolean): Promise<void> {
        const items = await fs.readdir(this.dirPath, { withFileTypes: true });
        const vaultItems = isDirectory ? this.plugin.settings.vaultDirs : this.plugin.settings.vaultFiles;
        const itemNames = items
            .filter(item => isDirectory ? item.isDirectory() : (item.isFile() && path.extname(item.name) === '.json'))
            .map(item => path.parse(item.name).name);

        // Remove items that no longer exist
        Object.keys(vaultItems).forEach(key => {
            if (!itemNames.includes(key)) {
                delete vaultItems[key];
            }
        });

        // Add new items
        itemNames.forEach(name => {
            if (!(name in vaultItems)) {
                vaultItems[name] = isDirectory ? (name !== 'plugins') : true;
            }
        });
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}
