import * as path from "path";
import * as fs from "fs-extra";
import { App, Modal, Setting } from "obsidian";
import type Tools from "./main.ts";
import type { ConfirmCallback } from "./types/global.js";
import { PluginSelectionModal } from "./plugin-selection-modal.ts";

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

    private initializeDestinationDirPath(): void {
        // Keep the dirPath as passed in constructor
        // For import: dirPath = source vault
        // For export: dirPath = destination vault
    }

    async onOpen(): Promise<void> {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: this.message });

        await this.updateVaultItemsList(true);
        await this.updateVaultItemsList(false);

        // Display summary of detected items
        const dirCount = Object.keys(this.plugin.settings.vaultDirs).length;
        const fileCount = Object.keys(this.plugin.settings.vaultFiles).length;
        if (dirCount > 0 || fileCount > 0) {
            const summaryText = `Found ${fileCount} configuration file(s) and ${dirCount} director${dirCount === 1 ? 'y' : 'ies'} in .obsidian folder`;
            contentEl.createEl('p', {
                text: summaryText,
                cls: 'setting-item-description'
            });
        }

        this.createMigrateSettingsSection('Directories', this.plugin.settings.vaultDirs);
        this.createMigrateSettingsSection('Files', this.plugin.settings.vaultFiles);

        await this.plugin.saveSettings();

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

        // Sort items by category and importance
        const sortedEntries = Object.entries(items).sort(([a], [b]) => {
            const priorityA = this.getItemPriority(a, title === 'Directories');
            const priorityB = this.getItemPriority(b, title === 'Directories');
            return priorityA - priorityB;
        });

        sortedEntries.forEach(([name, isEnabled]) => {
            const itemPath = path.join(this.dirPath, name + (title === 'Files' ? '.json' : ''));
            if (fs.existsSync(itemPath)) {
                const description = this.getItemDescription(name, title === 'Directories');
                const setting = new Setting(sectionEl)
                    .setName(`${this.isImport ? 'Import' : 'Export'} ${name}`)
                    .setDesc(description)
                    .addToggle((toggle) =>
                        toggle.setValue(isEnabled)
                            .onChange(async (value) => {
                                items[name] = value;

                                // Show/hide plugin selection button based on plugins toggle
                                if (name === 'plugins' && title === 'Directories') {
                                    this.togglePluginSelectionButton(setting, value, items);
                                }

                                await this.plugin.saveSettings();
                            }));

                // Add button to reopen plugin selection modal for plugins directory (only if enabled)
                if (name === 'plugins' && title === 'Directories') {
                    this.togglePluginSelectionButton(setting, isEnabled, items);
                }
            }
        });
    }

    private getItemPriority(name: string, isDirectory: boolean): number {
        if (isDirectory) {
            const dirPriorities: Record<string, number> = {
                'themes': 1,
                'snippets': 2,
                'plugins': 3
            };
            return dirPriorities[name] || 4;
        } else {
            const filePriorities: Record<string, number> = {
                'app': 1,
                'appearance': 2,
                'core-plugins': 3,
                'community-plugins': 4,
                'hotkeys': 5,
                'workspace': 6,
                'graph': 7,
                'command-palette': 8,
                'daily-notes': 9,
                'templates': 10
            };
            return filePriorities[name] || 11;
        }
    }

    private getItemDescription(name: string, isDirectory: boolean): string {
        if (isDirectory) {
            const dirDescriptions: Record<string, string> = {
                'themes': 'Custom themes and appearance modifications',
                'snippets': 'CSS snippets for custom styling',
                'plugins': 'Community plugins and their data'
            };

            let description = dirDescriptions[name] || `${name} directory`;

            // Add count for specific directories
            if (name === 'plugins') {
                const count = this.getPluginCount();
                description += ` (${count} plugin${count !== 1 ? 's' : ''})`;
            } else if (name === 'themes') {
                const count = this.getThemeCount();
                description += ` (${count} theme${count !== 1 ? 's' : ''})`;
            } else if (name === 'snippets') {
                const count = this.getSnippetCount();
                description += ` (${count} snippet${count !== 1 ? 's' : ''})`;
            }

            return description;
        } else {
            const fileDescriptions: Record<string, string> = {
                'app': 'General application settings',
                'appearance': 'Theme and appearance preferences',
                'core-plugins': 'Core plugins configuration',
                'hotkeys': 'Custom keyboard shortcuts',
                'workspace': 'Window layout and workspace settings',
                'graph': 'Graph view configuration',
                'command-palette': 'Command palette customizations',
                'daily-notes': 'Daily notes plugin settings',
                'templates': 'Templates plugin configuration',
                'types': 'File type associations',
                'core-plugins-migration': 'Core plugins migration data'
            };

            let description = fileDescriptions[name] || `${name} configuration file`;

            // Add dynamic warning for community-plugins
            if (name === 'community-plugins') {
                const action = this.isImport ? 'import' : 'export';
                description = `Community plugins settings (⚠️ activate if you ${action} plugins directory)`;
            }

            return description;
        }
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

        // Add new items with smart defaults
        itemNames.forEach(name => {
            if (!(name in vaultItems)) {
                if (isDirectory) {
                    // Default to false for plugins directory, true for others
                    vaultItems[name] = name !== 'plugins';
                } else {
                    // Default to true for most config files, but be selective for some
                    vaultItems[name] = this.getDefaultFileState(name);
                }
            }
        });
    }

    private getDefaultFileState(fileName: string): boolean {
        // Files that are commonly useful to import/export
        const commonFiles = [
            'app', 'appearance', 'core-plugins',
            'hotkeys', 'workspace', 'graph', 'command-palette',
            'daily-notes', 'templates', 'types'
        ];

        // Files that might be less commonly needed or require plugins
        const optionalFiles = [
            'core-plugins-migration', 'plugins', 'community-plugins'
        ];

        if (commonFiles.includes(fileName)) {
            return true;
        } else if (optionalFiles.includes(fileName)) {
            return false;
        } else {
            // Default to true for unknown files (user can disable if needed)
            return true;
        }
    }

    private getPluginCount(): number {
        try {
            const pluginsPath = path.join(this.dirPath, 'plugins');
            if (!fs.existsSync(pluginsPath)) return 0;

            const items = fs.readdirSync(pluginsPath, { withFileTypes: true });
            return items.filter(item => item.isDirectory()).length;
        } catch {
            return 0;
        }
    }

    private getThemeCount(): number {
        try {
            const themesPath = path.join(this.dirPath, 'themes');
            if (!fs.existsSync(themesPath)) return 0;

            const items = fs.readdirSync(themesPath, { withFileTypes: true });
            return items.filter(item => item.isFile() && item.name.endsWith('.css')).length;
        } catch {
            return 0;
        }
    }

    private getSnippetCount(): number {
        try {
            const snippetsPath = path.join(this.dirPath, 'snippets');
            if (!fs.existsSync(snippetsPath)) return 0;

            const items = fs.readdirSync(snippetsPath, { withFileTypes: true });
            return items.filter(item => item.isFile() && item.name.endsWith('.css')).length;
        } catch {
            return 0;
        }
    }

    private togglePluginSelectionButton(setting: Setting, isEnabled: boolean, vaultDirs: Record<string, boolean>): void {
        // Remove existing button if any
        const existingButton = setting.controlEl.querySelector('.plugin-selection-btn');
        if (existingButton) {
            existingButton.remove();
        }

        // Add button only if plugins toggle is enabled
        if (isEnabled) {
            setting.addButton(btn => {
                btn.setButtonText("Select Plugins")
                    .setTooltip("Choose which plugins to import/export")
                    .onClick(() => {
                        this.openPluginSelectionModal(vaultDirs);
                    });

                // Add a class for easy identification
                btn.buttonEl.addClass('plugin-selection-btn');
            });
        }
    }

    private openPluginSelectionModal(vaultDirs?: Record<string, boolean>): void {
        let pluginsPath: string;
        let destinationPluginsPath: string | undefined;

        if (this.isImport) {
            // Import: source = this.dirPath, destination = current vault
            pluginsPath = path.join(this.dirPath, 'plugins');
            destinationPluginsPath = undefined; // Current vault (handled in modal)
        } else {
            // Export: source = current vault, destination = this.dirPath
            pluginsPath = this.app.vault.adapter.getFullPath('.obsidian/plugins');
            destinationPluginsPath = path.join(this.dirPath, 'plugins');
        }

        new PluginSelectionModal(
            this.app,
            pluginsPath,
            this.isImport,
            (selectedPlugins) => {
                // Store selected plugins in settings
                this.plugin.settings.selectedPlugins = {};
                selectedPlugins.forEach(pluginId => {
                    this.plugin.settings.selectedPlugins[pluginId] = true;
                });

                this.plugin.saveSettings();
            },
            destinationPluginsPath
        ).open();
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}
