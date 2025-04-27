import { App, Modal, Setting } from "obsidian";
import type { ConfirmCallback } from "../types/global.js";

export class DeleteFolderConfirmModal extends Modal {
    constructor(
        app: App,
        public folderPath: string,
        public onSubmit: ConfirmCallback
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Get just the folder name from the path
        const folderName = this.folderPath.split('/').pop();

        contentEl.createEl("h2", { text: "Delete Confirmation" });
        contentEl.createEl("p", {
            text: `Are you sure you want to delete ALL folders named "${folderName}" across your entire vault?`
        });
        contentEl.createEl("p", {
            text: `This will find and delete every folder with the name "${folderName}", regardless of where they are located.`
        });
        contentEl.createEl("p", {
            text: "⚠️ This action will move all matching folders to trash."
        });

        new Setting(contentEl)
            .addButton((btn) => {
                btn.setButtonText("Confirm")
                    .setCta()
                    .onClick(() => {
                        this.onSubmit(true);
                        this.close();
                    });
            })
            .addButton((btn) =>
                btn.setButtonText("Cancel")
                    .onClick(() => {
                        this.onSubmit(false);
                        this.close();
                    }));
    }

    onClose() {
        this.contentEl.empty();
    }
}
