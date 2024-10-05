import { addMoveToVault } from "src/move to vault/move-to-vault";
import { createMoveFilesMenuCallback, registerOutOfVault } from "../move out from vault/move-out-menus";
import { SfdToEditorMenuCb, SfdToFileMenuCb, registerSFD } from "../search from directory/search-from-directory";
import { ToggleElement, ToolsSettings } from "./global";

export const DEFAULT_SETTINGS: ToolsSettings = {
    "move-out-from-vault": true,
    "move-to-vault": true,
    "search-from-directory": true,
    vaultDirs: {},
    vaultFiles: {}
};

export const settingsList: ToggleElement[] = [
    {
        setting: "search-from-directory",
        callback: async function (value: boolean) {
            if (value) {
                await registerSFD.bind(this.plugin)();
            } else {
                await this.app.workspace.off("file-menu", SfdToFileMenuCb.bind(this.plugin)());
                await this.app.workspace.off("editor-menu", SfdToEditorMenuCb.bind(this.plugin)());
                await this.app.commands.executeCommandById('app:reload');
            }
        },
        name: "search from directory(when turned off a reload is done)"
    }, {
        setting: "move-to-vault",
        callback: async function (value: boolean) {
            if (value) {
                addMoveToVault.bind(this.plugin)()
            } else {
                const list = [
                    'obsidian-my-tools:move-files-to-vault', 'obsidian-my-tools:move-directory-to-vault', 'obsidian-my-tools:copy-files-to-vault', 'obsidian-my-tools:copy-directory-to-vault'
                ]

                for (const command of list) await this.app.commands.removeCommand(command)
            }
        },
        name: "move/copy to vault"
    }, {
        setting: "move-out-from-vault",
        callback: async function (value: boolean) {
            if (value) {
                registerOutOfVault.bind(this.plugin)()
            } else {
                await this.app.workspace.off("file-menu", createMoveFilesMenuCallback.bind(this.plugin)())
                await this.app.workspace.off("files-menu", createMoveFilesMenuCallback.bind(this.plugin)())
                await this.app.commands.executeCommandById('app:reload')
            }
        },
        name: "move out from vault (when turned off a reload is done)"
    },
]