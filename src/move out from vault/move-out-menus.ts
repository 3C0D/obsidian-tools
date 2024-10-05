import { Menu, MenuItem, TFile, TFolder } from "obsidian";
import { moveOutOfVault } from "./copy-move-out-of-vault";

export function registerOutOfVault(): void {
    this.registerEvent(
        this.app.workspace.on("file-menu", createMoveFilesMenuCallback())
    );
    this.registerEvent(
        this.app.workspace.on("files-menu", createMoveFilesMenuCallback())
    );
}

export function createMoveFilesMenuCallback() {
    return (menu: Menu, files: TFile | TFolder | (TFile | TFolder)[]) => {
        const fileArray = Array.isArray(files) ? files : [files];

        menu.addSeparator();

        addMenuItem(menu, {
            title: "Copy Out From Vault",
            icon: "copy",
            callback: async () => await moveOutOfVault(fileArray, "copy")
        });

        addMenuItem(menu, {
            title: "Move Out From Vault",
            icon: "scissors",
            callback: async () => await moveOutOfVault(fileArray, "move")
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