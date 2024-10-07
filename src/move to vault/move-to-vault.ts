import * as path from "path";
import * as fs from "fs-extra";
import { picker } from "src/utils";
import { Menu, MenuItem, Notice, TFolder } from "obsidian";
import { OutFromVaultConfirmModal } from "src/move out from vault/out-of-vault-confirm_modal";
import { getIncrementedFilePath } from "src/move out from vault/copy-move-out-of-vault";

export function addMoveToVault() {
    this.addCommand({
        id: 'move-files-to-vault',
        name: 'Move file(s) to Vault',
        callback: async () => {
            await moveToVault(false, true)
        }
    })

    this.addCommand({
        id: 'move-directory-to-vault',
        name: 'Move directory to Vault',
        callback: async () => {
            await moveToVault(true, true)
        }
    })

    this.addCommand({
        id: 'copy-files-to-vault',
        name: 'Copy file(s) to Vault',
        callback: async () => {
            await moveToVault(false, false)
        }
    })

    this.addCommand({
        id: 'copy-directory-to-vault',
        name: 'Copy directory to Vault',
        callback: async () => {
            await moveToVault(true, false)
        }
    })

    this.registerEvent(this.app.workspace.on("file-menu", createMTVFolderMenu()));
}

export async function moveToVault(directory: boolean, move: boolean, postPath?: string): Promise<void> {
    const vaultPath = this.app.vault.adapter.getBasePath();
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
        new OutFromVaultConfirmModal(this.app, true, [], async (result) => {
            if (!result) return;
            await processFiles(selectedPaths, destinationPath, move, result.pastOption);
        }).open();
    } else {
        await processFiles(selectedPaths, destinationPath, move);
    }
}

async function processFiles(selectedPaths: string[], destinationPath: string, move: boolean, pastOption = 0) {
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

function createMTVFolderMenu() {
    return (menu: Menu, folder: TFolder) => {
        if (!(folder instanceof TFolder)) return;

        menu.addSeparator();

        const addMenuItem = (title: string, icon: string, directory: boolean, move: boolean) => {
            menu.addItem((item: MenuItem) => {
                item
                    .setTitle(title)
                    .setIcon(icon)
                    .onClick(async() => await moveToVault(directory, move, folder.path));
            });
        };

        addMenuItem("Copy file(s) to folder", "copy", false, false);
        addMenuItem("Move file(s) to folder", "scissors", false, true);
        addMenuItem("Copy dir(s) to folder", "copy", true, false);
        addMenuItem("Move dir(s) to folder", "scissors", true, true);
    };
}