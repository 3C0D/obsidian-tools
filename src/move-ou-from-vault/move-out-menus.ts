import { App, Menu, MenuItem, TFile, TFolder } from "obsidian";
import { moveOutOfVault } from "./copy-move-out-of-vault.ts";

export function registerOutOfVault(app: App): void {
    this.registerEvent(
        this.app.workspace.on("file-menu", createMoveFilesMenuCallback(app))
    );
    this.registerEvent(
        this.app.workspace.on("files-menu", createMoveFilesMenuCallback(app))
    );
}

export function createMoveFilesMenuCallback(app: App) {
    return (menu: Menu, files: TFile | TFolder | (TFile | TFolder)[]) => {
        const fileArray = Array.isArray(files) ? files : [files];

        if (fileArray.length === 1 && fileArray[0].path === "/") return;//vauult switcher contextmenu

        menu.addSeparator();

        addMenuItem(menu, {
            title: "Copy out from Vault",
            icon: "copy",
            callback: async () => await moveOutOfVault(app, fileArray, "copy")
        });

        addMenuItem(menu, {
            title: "Move out from Vault",
            icon: "scissors",
            callback: async () => await moveOutOfVault(app, fileArray, "move")
        });
    };
}

interface MenuItemOptions {
    title: string;
    icon: string;
    callback: () => Promise<void>;
}

function addMenuItem(menu: Menu, options: MenuItemOptions): void {
    menu.addItem((item: MenuItem) => {
        item.setTitle(options.title)
            .setIcon(options.icon)
            .onClick(options.callback);
    });
}