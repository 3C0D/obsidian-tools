import { Modal, App, Setting } from "obsidian";
import { getVaultPaths } from "./utils.ts";
import * as path from "path";

export class VaultChooser extends Modal {
    result: string;
    onSubmit: (result: string) => void;

    constructor(app: App, public source: boolean, onSubmit: (result: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen(): void {
        const { contentEl } = this;
        
        contentEl.createEl("h3", { text: this.source ? "Select the source vault" : "Select the destination vault" });
        contentEl.createEl("p", { text: "Click on a vault to select it, or choose from explorer." });

        // Ajouter du CSS pour les éléments cliquables
        contentEl.createEl("style", {
            text: `
            .clickable-setting {
                cursor: pointer;
                border-radius: 5px;
                transition: background-color 0.1s ease;
            }
            .clickable-setting:hover {
                background-color: var(--background-secondary);
            }
            `
        });

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("Choose vault folder from explorer")
                    .setIcon("folder")
                    .onClick(() => {
                        this.close();
                        this.onSubmit("");
                    }));

        getVaultPaths(this.app).forEach((_path: string) => {
            this.createVaultButtons(contentEl, _path);
        });
    }

    onClose(): void {
        this.contentEl.empty();
    }

    createVaultButtons(El: HTMLElement, _path: string): void {
        const vaultDir: string = path.dirname(_path);
        const vaultName: string = path.basename(_path);

        const setting = new Setting(El)
            .setName(vaultName)
            .setDesc(vaultDir)
            .addButton(btn => {
                btn
                    .setButtonText("Select")
                    .setCta()
                    .setIcon("checkmark")
                    .onClick(() => {
                        this.onSubmit(_path);
                    });
            });
        
        // Rendre toute la ligne cliquable
        setting.settingEl.addClass("clickable-setting");
        setting.settingEl.addEventListener("click", (e) => {
            // Éviter de déclencher si on clique déjà sur le bouton
            if (!(e.target as HTMLElement).closest(".setting-item-control")) {
                this.onSubmit(_path);
            }
        });
    }
}
