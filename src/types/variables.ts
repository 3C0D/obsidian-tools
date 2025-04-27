import { App } from "obsidian";
import type Tools from "../main.ts";
import { registerOutOfVault, createMoveFilesMenuCallback } from "../move out from vault/move-out-menus.ts";
import { addImportToVault } from "../import to vault/import-to-vault.ts";
import type { ToggleElement, ToolsSettings } from "obsidian-typings";
import { registerVaultContextMenu, uninstaller } from "../vaultContextMenu.ts";


export const DEFAULT_SETTINGS: Readonly<ToolsSettings> = {
    "move-out-from-vault": true,
    "import-to-vault": true,
    "search-from-directory": false, // Now native in Obsidian
    "vault-context-menu": true,
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
    }
]