import * as path from "path";
import * as fs from "fs-extra";
import { App, Modal, Setting } from "obsidian";
import Tools from "./main";
import { ConfirmCallback } from "./types/global";

export async function setMigrateOptions(
    plugin: Tools,
    dirPath: string,
    message: string,
    isImport: boolean
): Promise<boolean> {
    return new Promise((resolve) => {
        new MigrateModal(plugin.app, dirPath, plugin, message, resolve, isImport).open();
    });
}

class MigrateModal extends Modal {
    constructor(
        app: App,
        public dirPath: string,
        public plugin: Tools,
        public message: string,
        public callback: ConfirmCallback,
        public isImport: boolean
    ) {
        super(app);
        this.initializeDirPath();
    }

    private initializeDirPath() {
        if (!this.isImport) {
            //@ts-ignore
            this.dirPath = this.app.vault.adapter.getFullPath('.obsidian');
        }
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: this.message });
        contentEl.createEl('p', { text: '⚠️ Existing items will be replaced. Others will be kept.' });

        this.updateVaultItems(true)
        this.updateVaultItems(false)

        this.createSettingsSection('Directories', this.plugin.settings.vaultDirs);
        this.createSettingsSection('Files', this.plugin.settings.vaultFiles);

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

    private createSettingsSection(title: string, items: Record<string, boolean>): void {
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

    private updateVaultItems(isDirectory: boolean): void {
        const items = fs.readdirSync(this.dirPath)
            .filter(item => {
                const itemPath = path.join(this.dirPath, item);
                return isDirectory
                    ? fs.statSync(itemPath).isDirectory()
                    : (fs.statSync(itemPath).isFile() && path.extname(item) === '.json');
            });

        const vaultItems = isDirectory ? this.plugin.settings.vaultDirs : this.plugin.settings.vaultFiles;
        const itemNames = items.map(item => path.parse(item).name);

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