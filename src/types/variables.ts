import { addMoveToVault } from "src/move to vault/move-to-vault";
import { createMoveFilesMenuCallback, registerOutOfVault } from "../move out from vault/move-out-menus";
import { SfdToEditorMenuCb, SfdToFileMenuCb, registerSFD } from "../search from directory/search-from-directory";
import { ToggleElement, ToolsSettings } from "./global";
import { App } from "obsidian";
import Tools from "src/main";

export const DEFAULT_SETTINGS: Readonly<ToolsSettings> = {
    "move-out-from-vault": true,
    "move-to-vault": true,
    "search-from-directory": true,
    vaultDirs: {},
    vaultFiles: {}
};

export const settingsList: ToggleElement[] = [
    {
        setting: "search-from-directory",
        callback: async function (app: App, plugin: Tools, value: boolean) {
            if (value) {
                registerSFD.bind(this)();
            } else {
                app.workspace.off("file-menu", SfdToFileMenuCb.bind(this)());
                app.workspace.off("editor-menu", SfdToEditorMenuCb.bind(this)());
                app.commands.executeCommandById('app:reload');
            }
        },
        name: "search from directory(when turned off a reload is done)"
    }, {
        setting: "move-to-vault",
        callback: async function (app: App, plugin: Tools, value: boolean) {
            if (value) {
                addMoveToVault.call(this, app)
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
    }
]