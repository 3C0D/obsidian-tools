import { App, Modal, Setting, ToggleComponent } from "obsidian";
import * as path from "path";
import * as fs from "fs-extra";

interface PluginInfo {
    id: string;
    name: string;
    version?: string;
    description?: string;
    hasConflict?: boolean;
    isDevPlugin?: boolean;
    conflictReason?: string;
    destinationVersion?: string;
}

/**
 * Modal for selecting which plugins to import/export
 */
export class PluginSelectionModal extends Modal {
    private selectedPlugins: Map<string, boolean> = new Map();
    private toggles: Map<string, ToggleComponent> = new Map();
    private plugins: PluginInfo[] = [];
    private conflictCount = 0;
    private devPluginCount = 0;

    constructor(
        app: App,
        private pluginsPath: string,
        private isImport: boolean,
        private onSubmit: (selectedPlugins: string[]) => void,
        private destinationPluginsPath?: string
    ) {
        super(app);
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Set modal size for better readability
        this.modalEl.style.width = `600px`;
        this.modalEl.style.height = `500px`;

        // Load plugin information
        await this.loadPluginInfo();

        const action = this.isImport ? 'Import' : 'Export';
        contentEl.createEl("h2", { text: `${action} Plugin Selection` });

        // Show conflict warning if any conflicts detected
        if (this.conflictCount > 0) {
            const warningEl = contentEl.createEl("p");
            warningEl.innerHTML = `<strong style="color: red;">⚠️ Warning:</strong> ${this.conflictCount} plugin${this.conflictCount !== 1 ? 's' : ''} may cause conflicts and have been deselected.`;
            warningEl.style.marginBottom = "15px";
        }

        // Show dev plugin warning if any dev plugins detected
        if (this.devPluginCount > 0) {
            const devWarningEl = contentEl.createEl("p");
            devWarningEl.innerHTML = `<strong style="color: inherit;">Dev plugins:</strong> plugins in development.`;
            devWarningEl.style.marginBottom = "15px";
        }

        contentEl.createEl("p", {
            text: `Select which plugins you want to ${this.isImport ? 'import' : 'export'}.`
        });

        // Create scrollable container for plugin list
        const pluginListContainer = contentEl.createDiv();
        pluginListContainer.style.maxHeight = "300px";
        pluginListContainer.style.overflowY = "auto";
        pluginListContainer.style.border = "1px solid var(--background-modifier-border)";
        pluginListContainer.style.borderRadius = "5px";
        pluginListContainer.style.padding = "10px";
        pluginListContainer.style.marginBottom = "20px";

        if (this.plugins.length === 0) {
            pluginListContainer.createEl("p", {
                text: "No plugins found in the selected directory.",
                cls: "setting-item-description"
            });
        } else {
            // Add checkboxes for each plugin
            for (const plugin of this.plugins) {
                await this.createPluginSetting(pluginListContainer, plugin);
            }
        }

        // Add selection control buttons
        new Setting(contentEl)
            .addButton(btn => {
                btn.setButtonText("Deselect All")
                    .onClick(() => {
                        for (const plugin of this.plugins) {
                            const toggle = this.toggles.get(plugin.id);
                            if (toggle) {
                                toggle.setValue(false);
                            }
                            this.selectedPlugins.set(plugin.id, false);
                        }
                    });
            })
            .addButton(btn => {
                btn.setButtonText("Select All")
                    .onClick(() => {
                        for (const plugin of this.plugins) {
                            const toggle = this.toggles.get(plugin.id);
                            if (toggle) {
                                toggle.setValue(true);
                            }
                            this.selectedPlugins.set(plugin.id, true);
                        }
                    });
            });

        // Add action buttons at the bottom
        new Setting(contentEl)
            .addButton(btn => {
                btn.setButtonText("Confirm Selection")
                    .setCta()
                    .onClick(() => {
                        const selectedPluginIds = this.plugins
                            .filter(plugin => this.selectedPlugins.get(plugin.id))
                            .map(plugin => plugin.id);

                        this.close();
                        this.onSubmit(selectedPluginIds);
                    });
            })
            .addButton(btn => {
                btn.setButtonText("Cancel")
                    .onClick(() => {
                        this.close();
                    });
            });
    }

    onClose() {
        this.contentEl.empty();
    }

    private async createPluginSetting(container: HTMLElement, plugin: PluginInfo): Promise<void> {
        // Build title with warnings
        const titleParts = [plugin.name || plugin.id];
        if (plugin.hasConflict && plugin.conflictReason &&
            plugin.conflictReason !== 'Dev plugin conflict' &&
            plugin.conflictReason !== 'Overwriting dev plugin') {
            if (plugin.conflictReason === 'Lower version') {
                titleParts.push(`• <span style="color: orange;">${plugin.conflictReason}</span>`);
            } else {
                titleParts.push(`• ${plugin.conflictReason}`);
            }
        }
        if (plugin.isDevPlugin) {
            titleParts.push('• Dev plugin');
        }
        const title = titleParts.join(' ');

        // Build description with version comparison and contextual warnings
        let description = '';
        if (plugin.version) {
            // Always show version comparison when destination version exists
            const destinationVersion = await this.getDestinationVersion(plugin.id);
            if (destinationVersion) {
                const localLabel = this.isImport ? 'local' : 'destination';
                description = `Version: ${plugin.version} vs ${destinationVersion} (${localLabel})`;
            } else {
                description = `Version: ${plugin.version}`;
            }
        }

        const contextualWarning = await this.getContextualWarning(plugin);
        if (contextualWarning) {
            if (description) description += ' • ';
            description += `<span style="color: red;">${contextualWarning}</span>`;
        }

        const defaultSelected = !plugin.hasConflict; // Deselect conflicted plugins by default

        const setting = new Setting(container)
            .addToggle(toggle => {
                toggle.setValue(defaultSelected)
                    .onChange(value => {
                        this.selectedPlugins.set(plugin.id, value);
                    });

                // Store reference to the toggle component
                this.toggles.set(plugin.id, toggle);
                this.selectedPlugins.set(plugin.id, defaultSelected);
            });

        // Set title with HTML support
        setting.nameEl.innerHTML = title;

        // Set description with HTML support
        if (description) {
            setting.descEl.innerHTML = description;
        }
    }

    private async loadPluginInfo(): Promise<void> {
        try {
            if (!await fs.pathExists(this.pluginsPath)) {
                return;
            }

            const items = await fs.readdir(this.pluginsPath, { withFileTypes: true });
            const pluginDirs = items.filter(item => item.isDirectory());

            for (const dir of pluginDirs) {
                const pluginPath = path.join(this.pluginsPath, dir.name);
                const manifestPath = path.join(pluginPath, 'manifest.json');

                let pluginInfo: PluginInfo = { id: dir.name, name: dir.name };

                // Try to read manifest.json for additional info
                if (await fs.pathExists(manifestPath)) {
                    try {
                        const manifest = await fs.readJson(manifestPath);
                        pluginInfo = {
                            id: manifest.id || dir.name,
                            name: manifest.name || dir.name,
                            version: manifest.version,
                            description: manifest.description
                        };
                    } catch (error) {
                        console.warn(`Error reading manifest for ${dir.name}:`, error);
                    }
                }

                // Check if it's a dev plugin (has node_modules)
                pluginInfo.isDevPlugin = await this.isDevPlugin(pluginPath);
                if (pluginInfo.isDevPlugin) {
                    this.devPluginCount++;
                }

                // Check for version conflicts and dev plugin conflicts
                const conflictInfo = await this.checkVersionConflict(pluginInfo);
                const devConflictInfo = await this.checkDevPluginConflict(pluginInfo);

                if (conflictInfo || devConflictInfo) {
                    pluginInfo.hasConflict = true;
                    pluginInfo.conflictReason = (conflictInfo || devConflictInfo) || undefined;
                    this.conflictCount++;
                }

                this.plugins.push(pluginInfo);
            }

            // Sort plugins by name
            this.plugins.sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            console.error('Error loading plugin info:', error);
        }
    }

    private async isDevPlugin(pluginPath: string): Promise<boolean> {
        try {
            const nodeModulesPath = path.join(pluginPath, 'node_modules');
            return await fs.pathExists(nodeModulesPath);
        } catch {
            return false;
        }
    }

    /**
     * Get the destination plugins path based on operation type
     */
    private getDestinationPluginsPath(): string {
        if (this.isImport) {
            return this.app.vault.adapter.getFullPath('.obsidian/plugins');
        } else {
            return this.destinationPluginsPath || this.app.vault.adapter.getFullPath('.obsidian/plugins');
        }
    }

    private async checkVersionConflict(plugin: PluginInfo): Promise<string | null> {
        try {
            const destinationPluginsPath = this.getDestinationPluginsPath();
            const destinationPluginPath = path.join(destinationPluginsPath, plugin.id);
            const destinationManifestPath = path.join(destinationPluginPath, 'manifest.json');

            if (!await fs.pathExists(destinationManifestPath)) {
                return null;
            }

            const destinationManifest = await fs.readJson(destinationManifestPath);
            const destinationVersion = destinationManifest.version;
            const sourceVersion = plugin.version;

            if (!sourceVersion || !destinationVersion) {
                return null;
            }

            const comparison = this.compareVersions(sourceVersion, destinationVersion);

            if (comparison < 0) {
                plugin.destinationVersion = destinationVersion;
                return 'Lower version';
            }

            return null;
        } catch (error) {
            console.warn(`Error checking version conflict for ${plugin.id}:`, error);
            return null;
        }
    }

    private async getDestinationVersion(pluginId: string): Promise<string | null> {
        try {
            const destinationPluginsPath = this.getDestinationPluginsPath();
            const destinationPluginPath = path.join(destinationPluginsPath, pluginId);
            const destinationManifestPath = path.join(destinationPluginPath, 'manifest.json');

            if (!await fs.pathExists(destinationManifestPath)) {
                return null;
            }

            const destinationManifest = await fs.readJson(destinationManifestPath);
            const version = destinationManifest.version || null;

            if (version) {
                const isDestinationDev = await this.isDevPlugin(destinationPluginPath);
                if (isDestinationDev) {
                    return `${version} (Dev plugin)`;
                }
            }

            return version;
        } catch (error) {
            console.warn(`Error getting destination version for ${pluginId}:`, error);
            return null;
        }
    }

    private async checkDevPluginConflict(plugin: PluginInfo): Promise<string | null> {
        try {
            const destinationPluginsPath = this.getDestinationPluginsPath();
            const destinationPluginPath = path.join(destinationPluginsPath, plugin.id);

            if (!await fs.pathExists(destinationPluginPath)) {
                return null;
            }

            const destinationIsDevPlugin = await this.isDevPlugin(destinationPluginPath);

            // Dev plugin overwriting normal plugin
            if (plugin.isDevPlugin && !destinationIsDevPlugin) {
                return 'Dev plugin conflict';
            }

            // Normal plugin overwriting dev plugin
            if (!plugin.isDevPlugin && destinationIsDevPlugin) {
                return 'Overwriting dev plugin';
            }

            return null;
        } catch (error) {
            console.warn(`Error checking dev plugin conflict for ${plugin.id}:`, error);
            return null;
        }
    }

    private async getContextualWarning(plugin: PluginInfo): Promise<string | null> {
        try {
            const destinationPluginsPath = this.getDestinationPluginsPath();
            const destinationPluginPath = path.join(destinationPluginsPath, plugin.id);
            const destinationExists = await fs.pathExists(destinationPluginPath);

            let destinationIsDevPlugin = false;
            if (destinationExists) {
                destinationIsDevPlugin = await this.isDevPlugin(destinationPluginPath);
            }

            if (this.isImport) {
                // IMPORT: source (selected vault) → destination (current vault)
                if (destinationExists) {
                    // Case 1: Destination dev plugin ← Source normal plugin
                    if (destinationIsDevPlugin && !plugin.isDevPlugin) {
                        return '⚠️ May overwrite local development plugin with official plugin';
                    }
                    // Case 2: Destination normal plugin ← Source dev plugin
                    else if (!destinationIsDevPlugin && plugin.isDevPlugin) {
                        return '⚠️ May replace normal plugin with development plugin';
                    }
                    // Case 3: Destination dev plugin ← Source dev plugin
                    else if (destinationIsDevPlugin && plugin.isDevPlugin) {
                        return '⚠️ May overwrite local dev plugin with another dev plugin';
                    }
                    // Case 4: Destination normal plugin ← Source normal plugin (no warning needed)
                }
            } else {
                // EXPORT: source (current vault) → destination (selected vault)
                if (destinationExists) {
                    // Case 1: Source dev plugin → Destination normal plugin
                    if (plugin.isDevPlugin && !destinationIsDevPlugin) {
                        return '⚠️ May overwrite normal plugin with development plugin';
                    }
                    // Case 2: Source normal plugin → Destination dev plugin
                    else if (!plugin.isDevPlugin && destinationIsDevPlugin) {
                        return '⚠️ May overwrite development plugin at destination';
                    }
                    // Case 3: Source dev plugin → Destination dev plugin
                    else if (plugin.isDevPlugin && destinationIsDevPlugin) {
                        return '⚠️ May overwrite destination dev plugin with local dev plugin';
                    }
                    // Case 4: Source normal plugin → Destination normal plugin (no warning needed)
                }
            }

            return null;
        } catch (error) {
            console.warn(`Error getting contextual warning for ${plugin.id}:`, error);
            return null;
        }
    }

    private compareVersions(version1: string, version2: string): number {
        const v1parts = version1.split('.').map(Number);
        const v2parts = version2.split('.').map(Number);

        const maxLength = Math.max(v1parts.length, v2parts.length);

        for (let i = 0; i < maxLength; i++) {
            const v1part = v1parts[i] || 0;
            const v2part = v2parts[i] || 0;

            if (v1part < v2part) return -1;
            if (v1part > v2part) return 1;
        }

        return 0;
    }
}
