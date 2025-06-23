import { App, FuzzySuggestModal, TFile, TFolder } from "obsidian";

/**
 * Suggester modal that displays all folders in the vault
 */
export class FolderSearchModal extends FuzzySuggestModal<string> {
    // Store unique folder names to optimize the suggester
    private uniqueFolderNames: Map<string, TFolder[]>;

    constructor(app: App, folders: TFolder[]) {
        super(app);
        this.setPlaceholder("Search for folders by name");

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

        // Open a modal to display all folders with this name
        new FolderListModal(this.app, folderName, folders).open();
    }
}

/**
 * Modal to display a list of folders with the same name
 */
class FolderListModal extends FuzzySuggestModal<TFolder> {
    constructor(
        app: App,
        public folderName: string,
        public folders: TFolder[]
    ) {
        super(app);
        this.setPlaceholder(`Folders named "${folderName}" (double-click to reveal in explorer)`);
    }

    getItems(): TFolder[] {
        return this.folders;
    }

    getItemText(folder: TFolder): string {
        // Count files and subfolders
        const fileCount = this.countFiles(folder);
        const subfolderCount = this.countSubfolders(folder);

        // Create description text
        let contentInfo = "";
        if (fileCount === 0 && subfolderCount === 0) {
            contentInfo = "(empty)";
        } else {
            const parts = [];
            if (fileCount > 0) {
                parts.push(`${fileCount} file${fileCount !== 1 ? 's' : ''}`);
            }
            if (subfolderCount > 0) {
                parts.push(`${subfolderCount} subfolder${subfolderCount !== 1 ? 's' : ''}`);
            }
            contentInfo = `(contains ${parts.join(", ")})`;
        }

        return `${folder.path} ${contentInfo}`;
    }

    onChooseItem(folder: TFolder, evt: MouseEvent | KeyboardEvent): void {
        // Reveal the folder in explorer
        console.log("Folder revealed:", folder.path);

        // Use the file explorer view to reveal the folder
        const fileExplorer = this.app.workspace.getLeavesOfType("file-explorer")[0];
        if (fileExplorer && fileExplorer.view) {
            // @ts-ignore - The fileExplorer.view.revealInFolder method exists but is not in the type definitions
            fileExplorer.view.revealInFolder(folder);
        }

        this.close();
    }

    /**
     * Count the number of files in a folder (non-recursive)
     */
    private countFiles(folder: TFolder): number {
        return folder.children.filter(child => child instanceof TFile).length;
    }

    /**
     * Count the number of subfolders in a folder (non-recursive)
     */
    private countSubfolders(folder: TFolder): number {
        return folder.children.filter(child => child instanceof TFolder).length;
    }
}

/**
 * Get all folders in the vault
 */
export function getAllFolders(app: App): TFolder[] {
    const folders: TFolder[] = [];

    function collectFolders(folder: TFolder): void {
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
 * Register the search folders command
 */
export function registerSearchFolders(app: App): void {
    const folders = getAllFolders(app);
    new FolderSearchModal(app, folders).open();
}
