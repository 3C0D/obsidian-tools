import { Modal, App, Setting } from "obsidian";
import { vaultPaths } from "./utils";
import * as path from "path";

export class VaultChooser extends Modal {
    result: string;
    onSubmit: (result: string) => void;

    constructor(app: App, public source: boolean, onSubmit: (result: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h3", { text: this.source ? "Select the source vault" : "Select the destination vault" });

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("Chose vault folder from explorer")
                    .onClick(() => {
                        this.close();
                        this.onSubmit("");
                    }));

        vaultPaths.forEach((_path) => {
            this.createButtons(contentEl, _path)
        })
    }

    onClose() {
        this.contentEl.empty();
    }

    createButtons(El: HTMLElement, _path: string) {

        const vaultDir: string = path.dirname(_path);
        const vaultName: string = path.basename(_path);

        new Setting(El)
            .setName(vaultName)
            .setDesc(vaultDir)
            .addButton(btn => {
                btn
                    .setIcon("checkmark")
                    .onClick(() => {
                        this.onSubmit(_path)
                    });
            })
    }
}