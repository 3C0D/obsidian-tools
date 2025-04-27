import { App, FuzzySuggestModal, Notice, TFolder } from "obsidian";
import { GenericConfirmModal } from "../common/generic-confirm-modal.ts";

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

        // Create paths list for confirmation message
        const pathsList = folders.map(f => `• ${f.path}`).join('\n');

        // Use the generic confirmation modal
        new GenericConfirmModal(
            this.app,
            "Delete Confirmation",
            [
                `Are you sure you want to delete ALL folders named "${folderName}" across your entire vault?`,
                `This will delete the following ${folders.length} folder${folders.length !== 1 ? 's' : ''}:`,
                pathsList,
                "⚠️ This action will move all matching folders to trash."
            ],
            "Confirm",
            "Cancel",
            async (confirmed) => {
                if (confirmed) {
                    await deleteFoldersByName(this.app, folderName);
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
    let failedCount = 0;

    for (const folder of foldersToDelete) {
        try {
            await app.vault.trash(folder, true);
            deletedCount++;
        } catch (error) {
            console.error(`Error deleting folder ${folder.path}:`, error);
            new Notice(`Failed to delete folder ${folder.path}`, 3000);
            failedCount++;
        }
    }

    if (deletedCount > 0) {
        new Notice(`${deletedCount} folder(s) named "${folderName}" moved to trash.`, 4000);
    }

    if (failedCount > 0) {
        new Notice(`Failed to delete ${failedCount} folder(s). Check console for details.`, 4000);
    }
}

/**
 * Register the delete folders by name command
 */
export function registerDeleteFoldersByName(app: App): void {
    const folders = getAllFolders(app);
    new FolderSuggestModal(app, folders).open();
}
