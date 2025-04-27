import { App, FuzzySuggestModal, Notice, TFolder } from "obsidian";
import { DeleteFolderConfirmModal } from "./delete-folder-confirm-modal.ts";

/**
 * Suggester modal that displays all folders in the vault
 */
export class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
    folders: TFolder[];

    constructor(app: App, folders: TFolder[]) {
        super(app);
        this.folders = folders;
        this.setPlaceholder("Select any folder with the name you want to delete");
    }

    getItems(): TFolder[] {
        return this.folders;
    }

    getItemText(folder: TFolder): string {
        // Show the full path for context, but highlight that we're looking at folder names
        return `${folder.path} (name: "${folder.name}")`;
    }

    onChooseItem(folder: TFolder, _evt: MouseEvent | KeyboardEvent): void {
        new DeleteFolderConfirmModal(this.app, folder.path, async (confirmed) => {
            if (confirmed) {
                await deleteFoldersByName(this.app, folder.name);
            }
        }).open();
    }
}

/**
 * Get all folders in the vault
 */
export function getAllFolders(app: App): TFolder[] {
    const folders: TFolder[] = [];

    function collectFolders(folder: TFolder) {
        // Skip root folder
        if (folder.path !== "/") {
            folders.push(folder);
        }

        // Recursively collect subfolders
        for (const child of folder.children) {
            if (child instanceof TFolder) {
                collectFolders(child);
            }
        }
    }

    // Start from the root folder
    collectFolders(app.vault.getRoot());

    return folders;
}

/**
 * Delete all folders with the given name
 */
export async function deleteFoldersByName(app: App, folderName: string): Promise<void> {
    const folders = getAllFolders(app);
    const foldersToDelete = folders.filter(folder => folder.name === folderName);

    if (foldersToDelete.length === 0) {
        new Notice(`No folder named "${folderName}" was found.`);
        return;
    }

    let deletedCount = 0;
    for (const folder of foldersToDelete) {
        try {
            await app.vault.trash(folder, true);
            deletedCount++;
        } catch (error) {
            console.error(`Error deleting folder ${folder.path}:`, error);
            new Notice(`Failed to delete folder ${folder.path}`);
        }
    }

    new Notice(`${deletedCount} folder(s) named "${folderName}" deleted.`);
}

/**
 * Register the delete folders by name command
 */
export function registerDeleteFoldersByName(app: App): void {
    const folders = getAllFolders(app);
    new FolderSuggestModal(app, folders).open();
}
