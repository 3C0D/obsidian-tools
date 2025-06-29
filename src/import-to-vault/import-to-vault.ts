import * as path from "path";
import * as fs from "fs-extra";
import { App, Menu, MenuItem, Notice, TFolder } from "obsidian";
import { getIncrementedFilePath } from "../move-ou-from-vault/copy-move-out-of-vault.ts";
import { OutFromVaultConfirmModal } from "../move-ou-from-vault/out-of-vault-confirm_modal.ts";
import { picker } from "../utils.ts";


export function addImportToVault(app: App): void {
    this.addCommand({
        id: 'import-files-to-vault',
        name: 'Import file(s) to Vault',
        callback: async () => {
            await importToVault(app, false, true);
        }
    });

    this.addCommand({
        id: 'import-directory-to-vault',
        name: 'Import directory to Vault',
        callback: async () => {
            await importToVault(app, true, true);
        }
    });

    this.addCommand({
        id: 'copy-files-to-vault',
        name: 'Copy file(s) to Vault',
        callback: async () => {
            await importToVault(app, false, false);
        }
    });

    this.addCommand({
        id: 'copy-directory-to-vault',
        name: 'Copy directory to Vault',
        callback: async () => {
            await importToVault(app, true, false);
        }
    });

    this.registerEvent(app.workspace.on("file-menu", createMTVFolderMenu(app)));
}

export async function importToVault(app: App, directory: boolean, move: boolean, postPath?: string): Promise<void> {
    const vaultPath = app.vault.adapter.basePath;
    const destinationPath = postPath ? path.join(vaultPath, postPath) : vaultPath;

    const msg = `Choose ${directory ? "dir(s)" : "file(s)"} to import`;
    const selectedPaths = await picker(msg, directory ? ['openDirectory', 'multiSelections'] : ['openFile', 'multiSelections']) as string[];

    if (!selectedPaths || !selectedPaths.length) return;

    let runModal = false;
    const existingFiles: string[] = [];

    for (const p of selectedPaths) {
        const fileName = path.basename(p);
        const destination = path.join(destinationPath, fileName);
        if (await fs.pathExists(destination)) {
            runModal = true;
            existingFiles.push(fileName);
        }
    }

    if (runModal) {
        new OutFromVaultConfirmModal(app, true, [], async (result) => {
            if (!result) return;
            await processFiles(selectedPaths, destinationPath, move, result.pastOption);
        }).open();
    } else {
        await processFiles(selectedPaths, destinationPath, move);
    }
}

async function processFiles(selectedPaths: string[], destinationPath: string, move: boolean, pastOption = 0): Promise<void> {
    for (const p of selectedPaths) {
        const fileName = path.basename(p);
        let destination = path.join(destinationPath, fileName);

        try {
            if (pastOption === 2) {
                destination = await getIncrementedFilePath(destinationPath, fileName);
            }

            if (move) {
                await fs.move(p, destination, { overwrite: pastOption === 1 });
            } else {
                await fs.copy(p, destination, { overwrite: pastOption === 1 });
            }
            new Notice(`Successfully ${move ? 'moved' : 'copied'} ${fileName} to vault`);
        } catch (err) {
            console.warn(`Error ${move ? 'moving' : 'copying'} ${fileName}: ${err}`);
            new Notice(`Failed to ${move ? 'move' : 'copy'} ${fileName} to vault`);
        }
    }
}

function createMTVFolderMenu(app: App) {
    return (menu: Menu, folder: TFolder): void => {
        const isFolder = folder instanceof TFolder;
        if (!isFolder) return;

        menu.addSeparator();
        menu.addItem(async (item) => {
            item.setTitle("Import to folder").setIcon("folder-input");
            const submenu = item.setSubmenu();
            const addSubMenuItem = (title: string, icon: string, directory: boolean, move: boolean): void => {
                submenu.addItem((item: MenuItem) => {
                    item
                        .setTitle(title)
                        .setIcon(icon)
                        .onClick(async () => await importToVault(app, directory, move, folder.path));
                });
            };
            submenu.addItem((item) => {
                item.setIsLabel(true).setTitle("Import file(s)");
            });
            addSubMenuItem("Copy", "copy", false, false);
            addSubMenuItem("Cut", "scissors", false, true);
            submenu.addSeparator();
            submenu.addItem((item) => {
                item.setIsLabel(true).setTitle("Import folder(s)");
            });
            addSubMenuItem("Copy", "copy", true, false);
            addSubMenuItem("Cut", "scissors", true, true);
        });
    };
}