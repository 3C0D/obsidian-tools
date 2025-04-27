import { App, Modal, Setting, ToggleComponent, TFile, TFolder } from "obsidian";

/**
 * Modal for confirming folder deletion with checkboxes for each folder
 */
export class DeleteFoldersCheckboxModal extends Modal {
    private selectedFolders: Map<string, boolean> = new Map();
    private toggles: Map<string, ToggleComponent> = new Map();

    constructor(
        app: App,
        public folderName: string,
        public folders: TFolder[],
        public onSubmit: (selectedFolders: TFolder[]) => void
    ) {
        super(app);

        // Initialize all folders as selected by default
        for (const folder of folders) {
            this.selectedFolders.set(folder.path, true);
        }
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Set modal size for better readability
        this.modalEl.style.width = `500px`;
        this.modalEl.style.height = `400px`;

        // Add title and warning
        contentEl.createEl("h2", { text: "Delete Folders Confirmation" });

        const warningEl = contentEl.createEl("p");
        warningEl.innerHTML = `<strong style="color: red;">⚠️ Warning:</strong> You are about to delete folders named "<strong>${this.folderName}</strong>"`;

        contentEl.createEl("p", {
            text: "Select the folders you want to delete. All selected folders will be moved to trash."
        });

        // Create a scrollable container for the folder list
        const folderListContainer = contentEl.createDiv();
        folderListContainer.style.maxHeight = "200px";
        folderListContainer.style.overflow = "auto";
        folderListContainer.style.border = "1px solid var(--background-modifier-border)";
        folderListContainer.style.borderRadius = "4px";
        folderListContainer.style.padding = "8px";
        folderListContainer.style.marginBottom = "16px";

        // Add checkboxes for each folder with content info
        for (const folder of this.folders) {
            // Count files and subfolders
            const fileCount = this.countFiles(folder);
            const subfolderCount = this.countSubfolders(folder);

            // Create description text
            let description = "";
            if (fileCount === 0 && subfolderCount === 0) {
                description = "(empty)";
            } else {
                const parts = [];
                if (fileCount > 0) {
                    parts.push(`${fileCount} file${fileCount !== 1 ? 's' : ''}`);
                }
                if (subfolderCount > 0) {
                    parts.push(`${subfolderCount} subfolder${subfolderCount !== 1 ? 's' : ''}`);
                }
                description = `(contains ${parts.join(", ")})`;
            }

            const setting = new Setting(folderListContainer)
                .setName(folder.path)
                .setDesc(description)
                .addToggle(toggle => {
                    toggle.setValue(true)
                        .onChange(value => {
                            this.selectedFolders.set(folder.path, value);
                        });

                    // Store reference to the toggle component
                    this.toggles.set(folder.path, toggle);
                });
        }

        // Add buttons
        new Setting(contentEl)
            .addButton(btn => {
                btn.setButtonText("Select All")
                    .onClick(() => {
                        // Use the stored toggle references to set all to true
                        for (const folder of this.folders) {
                            const toggle = this.toggles.get(folder.path);
                            if (toggle) {
                                toggle.setValue(true);
                            }
                            this.selectedFolders.set(folder.path, true);
                        }
                    });
            })
            .addButton(btn => {
                btn.setButtonText("Deselect All")
                    .onClick(() => {
                        // Use the stored toggle references to set all to false
                        for (const folder of this.folders) {
                            const toggle = this.toggles.get(folder.path);
                            if (toggle) {
                                toggle.setValue(false);
                            }
                            this.selectedFolders.set(folder.path, false);
                        }
                    });
            });

        // Add action buttons at the bottom
        new Setting(contentEl)
            .addButton(btn => {
                btn.setButtonText("Delete Selected")
                    .setCta()
                    .onClick(() => {
                        // Get only the selected folders
                        const selectedFolders = this.folders.filter(folder =>
                            this.selectedFolders.get(folder.path)
                        );

                        if (selectedFolders.length === 0) {
                            // If no folders are selected, just close the modal
                            this.close();
                            return;
                        }

                        this.close();
                        this.onSubmit(selectedFolders);
                    });
            })
            .addButton(btn => {
                btn.setButtonText("Cancel")
                    .onClick(() => {
                        this.close();
                    });
            });
    }

    onClose() {
        this.contentEl.empty();
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
