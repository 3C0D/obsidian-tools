import { App, Menu, MenuItem, Notice, TFolder } from "obsidian";
import { DeleteEmptyFoldersModal } from "./delete-empty-folders-modal.ts";

/**
 * Add delete empty folders functionality to the plugin
 */
export function addDeleteEmptyFolders(app: App): void {
    // Add command for deleting empty folders from root
    this.addCommand({
        id: 'delete-empty-folders',
        name: 'Delete empty folders',
        callback: async () => {
            await deleteEmptyFolders(app);
        }
    });

    // Register context menu for folders
    this.registerEvent(app.workspace.on("file-menu", createDeleteEmptyFoldersMenu(app)));
}

/**
 * Create context menu callback for folders - used for unregistering
 */
export function createDeleteEmptyFoldersMenu(app: App) {
    return (menu: Menu, folder: TFolder): void => {
        if (!(folder instanceof TFolder)) return;

        menu.addSeparator();
        menu.addItem((item: MenuItem) => {
            item
                .setTitle("Delete empty folders")
                .setIcon("trash-2")
                .onClick(async () => await deleteEmptyFolders(app, folder.path));
        });
    };
}

/**
 * Main function to delete empty folders
 * @param app - Obsidian App instance
 * @param folderPath - Optional folder path, defaults to vault root
 */
export async function deleteEmptyFolders(app: App, folderPath?: string): Promise<void> {
    const startFolder = folderPath ?
        app.vault.getAbstractFileByPath(folderPath) as TFolder :
        app.vault.getRoot();

    if (!startFolder || !(startFolder instanceof TFolder)) {
        new Notice("Invalid folder path");
        return;
    }

    // Find all empty folders recursively
    const emptyFolders = findEmptyFolders(startFolder);

    if (emptyFolders.length === 0) {
        new Notice("No empty folders found");
        return;
    }

    // Show confirmation modal with checkboxes
    new DeleteEmptyFoldersModal(
        app,
        emptyFolders,
        async (selectedFolders) => {
            if (selectedFolders.length > 0) {
                await deleteSelectedFolders(app, selectedFolders);
            }
        }
    ).open();
}

/**
 * Recursively find all empty folders in a given folder
 * @param folder - The folder to search in
 * @returns Array of empty TFolder instances
 */
function findEmptyFolders(folder: TFolder): TFolder[] {
    const emptyFolders: TFolder[] = [];

    // Don't include the vault root folder itself
    if (folder.isRoot()) {
        // Only process children of root, not root itself
        for (const child of folder.children) {
            if (child instanceof TFolder) {
                emptyFolders.push(...findEmptyFolders(child));
            }
        }
        return emptyFolders;
    }

    // First, recursively check all subfolders
    for (const child of folder.children) {
        if (child instanceof TFolder) {
            emptyFolders.push(...findEmptyFolders(child));
        }
    }

    // Check if current folder is empty (no files and no non-empty subfolders)
    const hasFiles = folder.children.some(child => !(child instanceof TFolder));
    const hasNonEmptySubfolders = folder.children.some(child =>
        child instanceof TFolder && !emptyFolders.includes(child)
    );

    if (!hasFiles && !hasNonEmptySubfolders && folder.children.length > 0) {
        // Folder only contains empty subfolders
        emptyFolders.push(folder);
    } else if (folder.children.length === 0) {
        // Folder is completely empty
        emptyFolders.push(folder);
    }

    return emptyFolders;
}

/**
 * Delete the selected folders
 * @param app - Obsidian App instance
 * @param folders - Array of folders to delete
 */
async function deleteSelectedFolders(app: App, folders: TFolder[]): Promise<void> {
    let successCount = 0;
    let skippedCount = 0;

    for (const folder of folders) {
        try {
            await app.vault.delete(folder);
            successCount++;
        } catch (error) {
            // Silently ignore errors - this happens when a parent folder was already deleted
            // and the child folder no longer exists. This is expected behavior.
            skippedCount++;
            console.debug(`Skipped folder ${folder.path} (likely already deleted with parent):`, error);
        }
    }

    // Show result notice
    if (successCount > 0) {
        new Notice(`Successfully deleted ${successCount} empty folder${successCount !== 1 ? 's' : ''}`);
    }

    // Only show skipped notice if there were actual errors (not just parent/child deletions)
    if (skippedCount > 0 && successCount === 0) {
        new Notice(`No folders could be deleted. They may have been removed already or contain files.`);
    }
}


