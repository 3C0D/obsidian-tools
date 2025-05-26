import { App } from "obsidian";
import type Tools from "../main.ts";
import type { ToggleElement, ToolsSettings } from "obsidian-typings";
import { registerVaultContextMenu, uninstaller } from "../vaultContextMenu.ts";
import { registerDeleteFoldersByName } from "../delete-folders-by-name/delete-folders-by-name.ts";
import { registerSearchFolders } from "../search-folders/search-folders.ts";
import { addImportToVault } from "../import-to-vault/import-to-vault.ts";
import { registerOutOfVault, createMoveFilesMenuCallback } from "../move-ou-from-vault/move-out-menus.ts";
import { addDeleteEmptyFolders } from "../delete-empty-folders/delete-empty-folders.ts";


export const DEFAULT_SETTINGS: Readonly<ToolsSettings> = {
    "move-out-from-vault": true,
    "import-to-vault": true,
    "search-from-directory": false, // Now native in Obsidian
    "vault-context-menu": true,
    "delete-folders-by-name": true,
    "search-folders": true,
    "delete-empty-folders": true,
    vaultDirs: {},
    vaultFiles: {}
};

export const settingsList: ToggleElement[] = [
    // Search from directory is now native in Obsidian
    {
        setting: "import-to-vault",
        callback: async function (app: App, plugin: Tools, value: boolean) {
            if (value) {
                addImportToVault.call(this, app)
            } else {
                const list = [
                    'obsidian-my-tools:move-files-to-vault', 'obsidian-my-tools:move-directory-to-vault', 'obsidian-my-tools:copy-files-to-vault', 'obsidian-my-tools:copy-directory-to-vault'
                ]

                for (const command of list) app.commands.removeCommand(command)
            }
        },
        name: "move/copy to vault"
    }, {
        setting: "move-out-from-vault",
        callback: async function (app: App, plugin: Tools, value: boolean) {
            if (value) {
                registerOutOfVault.bind(this)()
            } else {
                app.workspace.off("file-menu", createMoveFilesMenuCallback.bind(this)())
                app.workspace.off("files-menu", createMoveFilesMenuCallback.bind(this)())
                app.commands.executeCommandById('app:reload')
            }
        },
        name: "move out from vault (when turned off a reload is done)"
    }, {
        setting: "vault-context-menu",
        callback: async function (app: App, plugin: Tools, value: boolean) {
            if (value) {
                registerVaultContextMenu.call(plugin)
            } else {
                uninstaller()
            }
        },
        name: "vault context menu"
    }, {
        setting: "delete-folders-by-name",
        callback: async function (app: App, plugin: Tools, value: boolean) {
            if (value) {
                // Add the command if it's enabled
                plugin.addCommand({
                    id: 'delete-folders-by-name',
                    name: 'Delete folders by name',
                    callback: () => registerDeleteFoldersByName(app),
                });
            } else {
                // Remove the command if it's disabled
                app.commands.removeCommand('obsidian-my-tools:delete-folders-by-name');
            }
        },
        name: "delete folders by name"
    }, {
        setting: "search-folders",
        callback: async function (app: App, plugin: Tools, value: boolean) {
            if (value) {
                // Add the command if it's enabled
                plugin.addCommand({
                    id: 'search-folders',
                    name: 'Search folders',
                    callback: () => registerSearchFolders(app),
                });
            } else {
                // Remove the command if it's disabled
                app.commands.removeCommand('obsidian-my-tools:search-folders');
            }
        },
        name: "search folders"
    }, {
        setting: "delete-empty-folders",
        callback: async function (app: App, plugin: Tools, value: boolean) {
            if (value) {
                addDeleteEmptyFolders.call(plugin, app);
            } else {
                // Remove the command if it's disabled
                app.commands.removeCommand('obsidian-my-tools:delete-empty-folders');
            }
        },
        name: "delete empty folders"
    }
]