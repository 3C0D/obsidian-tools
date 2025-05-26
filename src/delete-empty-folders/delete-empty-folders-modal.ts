import { App, Modal, Setting, ToggleComponent, TFile, TFolder } from "obsidian";

/**
 * Modal for confirming empty folder deletion with checkboxes for each folder
 */
export class DeleteEmptyFoldersModal extends Modal {
    private selectedFolders: Map<string, boolean> = new Map();
    private toggles: Map<string, ToggleComponent> = new Map();

    constructor(
        app: App,
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
        this.modalEl.style.width = `600px`;
        this.modalEl.style.height = `500px`;

        // Add title and warning
        contentEl.createEl("h2", { text: "Delete Empty Folders Confirmation" });

        const warningEl = contentEl.createEl("p");
        warningEl.innerHTML = `<strong style="color: red;">⚠️ Warning:</strong> You are about to delete <strong>${this.folders.length}</strong> empty folder${this.folders.length !== 1 ? 's' : ''}`;

        contentEl.createEl("p", {
            text: "Select the empty folders you want to delete. All selected folders will be moved to trash."
        });

        // Create a scrollable container for the folder list
        const folderListContainer = contentEl.createDiv();
        folderListContainer.style.maxHeight = "300px";
        folderListContainer.style.overflow = "auto";
        folderListContainer.style.border = "1px solid var(--background-modifier-border)";
        folderListContainer.style.borderRadius = "4px";
        folderListContainer.style.padding = "8px";
        folderListContainer.style.marginBottom = "16px";

        // Sort folders by path for better organization
        const sortedFolders = [...this.folders].sort((a, b) => a.path.localeCompare(b.path));

        // Add checkboxes for each folder
        for (const folder of sortedFolders) {
            const setting = new Setting(folderListContainer)
                .setName(folder.path)
                .setDesc("(empty folder)")
                .addToggle(toggle => {
                    toggle.setValue(true)
                        .onChange(value => {
                            this.selectedFolders.set(folder.path, value);
                        });

                    // Store reference to the toggle component
                    this.toggles.set(folder.path, toggle);
                });
        }

        // Add selection control buttons
        new Setting(contentEl)
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
            })
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
                btn.setButtonText("Close")
                    .onClick(() => {
                        this.close();
                    });
            });
    }

    onClose() {
        this.contentEl.empty();
    }
}
