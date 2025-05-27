import { App, FuzzySuggestModal, Notice, TFolder } from "obsidian";
import { DeleteFoldersCheckboxModal } from "./delete-folders-checkbox-modal.ts";

/**
 * Suggester modal that displays all folders in the vault
 */
export class FolderSuggestModal extends FuzzySuggestModal<string> {
    // Store unique folder names to optimize the suggester
    private uniqueFolderNames: Map<string, TFolder[]>;

    constructor(app: App, folders: TFolder[]) {
        super(app);
        this.setPlaceholder("Select a folder name to delete");

        // Group folders by name for more efficient processing
        this.uniqueFolderNames = new Map();
        for (const folder of folders) {
            if (!this.uniqueFolderNames.has(folder.name)) {
                this.uniqueFolderNames.set(folder.name, []);
            }
            this.uniqueFolderNames.get(folder.name)?.push(folder);
        }
    }

    getItems(): string[] {
        // Return unique folder names instead of folder objects
        return Array.from(this.uniqueFolderNames.keys());
    }

    getItemText(folderName: string): string {
        // Show the folder name and count of occurrences
        const count = this.uniqueFolderNames.get(folderName)?.length || 0;
        return `${folderName} (${count} folder${count !== 1 ? 's' : ''})`;
    }

    onChooseItem(folderName: string, _evt: MouseEvent | KeyboardEvent): void {
        const folders = this.uniqueFolderNames.get(folderName) || [];
        if (folders.length === 0) return;

        // Use the checkbox confirmation modal
        new DeleteFoldersCheckboxModal(
            this.app,
            folderName,
            folders,
            async (selectedFolders) => {
                if (selectedFolders.length > 0) {
                    await deleteSelectedFolders(this.app, selectedFolders);
                }
            }
        ).open();
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
 * Delete selected folders
 */
export async function deleteSelectedFolders(app: App, foldersToDelete: TFolder[]): Promise<void> {
    if (foldersToDelete.length === 0) {
        return;
    }

    // Sort folders by path length (shortest first) to delete parents before children
    const sortedFolders = [...foldersToDelete].sort((a, b) => a.path.length - b.path.length);

    // Keep track of deleted paths to avoid errors when trying to delete children of already deleted folders
    const deletedPaths: string[] = [];
    let deletedCount = 0;
    let failedCount = 0;

    for (const folder of sortedFolders) {
        // Skip if this folder is a child of an already deleted folder
        if (deletedPaths.some(path => folder.path.startsWith(path + "/"))) {
            // This folder was already deleted as part of a parent folder
            deletedCount++;
            continue;
        }

        try {
            await app.vault.trash(folder, true);
            deletedCount++;
            deletedPaths.push(folder.path);
        } catch (error) {
            // Check if the error is because the folder doesn't exist (already deleted)
            const errorMessage = String(error);
            if (errorMessage.includes("does not exist") || errorMessage.includes("no such file")) {
                // Folder was already deleted, count it as success
                deletedCount++;
            } else {
                console.error(`Error deleting folder ${folder.path}:`, error);
                new Notice(`Failed to delete folder ${folder.path}`, 3000);
                failedCount++;
            }
        }
    }

    if (deletedCount > 0) {
        new Notice(`${deletedCount} folder(s) moved to trash.`, 4000);
    }

    if (failedCount > 0) {
        new Notice(`Failed to delete ${failedCount} folder(s). Check console for details.`, 4000);
    }
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

    await deleteSelectedFolders(app, foldersToDelete);
}

/**
 * Register the delete folders by name command
 */
export function registerDeleteFoldersByName(app: App): void {
    const folders = getAllFolders(app);
    new FolderSuggestModal(app, folders).open();
}
