import { App, Modal, Setting, TFile } from "obsidian";

export class OutFromVaultConfirmModal extends Modal {
	private attachedAfterToggle: TFile[];

	constructor(
		app: App,
		public runModal: boolean,
		public attached: TFile[],
		public onSubmit: (result: { pastOption: number, attached: TFile[] } | null) => void
	) {
		super(app);
		this.attachedAfterToggle = attached;
	}
	onOpen(): void {
		// modal size
		this.modalEl.style.width = `500px`;
		this.modalEl.style.height = `350px`;

		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: "Out of Vault Confirmation" });

		if (this.attached.length) {
			new Setting(contentEl)
				.setName("Join attached resolved links")
				.addToggle((toggle) => {
					toggle.setValue(true);
					toggle.onChange(async (value) => {
						this.attachedAfterToggle = value ? this.attached : [];
					});
				});
		}
		if (this.runModal) {
			new Setting(contentEl)
				.setName("Some files already exist.")
				.addButton((b) => {
					b.setButtonText("Overwrite")
						.setCta()
						.setTooltip("overwrite existing files")
						.onClick(async () => {
							this.close();
							this.onSubmit({ pastOption: 1, attached: this.attachedAfterToggle });
						});
				})
				.addButton((b) => {
					b.setButtonText("Increment")
						.setCta()
						.setTooltip("increment path if file exists")
						.onClick(async () => {
							this.close();
							this.onSubmit({ pastOption: 2, attached: this.attachedAfterToggle });
						});
				});

		} else if (this.attached.length) {
			new Setting(contentEl)
				.addButton((b) => {
					b.setButtonText("Proceed")
						.setCta()
						.setTooltip("Proceed with selected options")
						.onClick(async () => {
							this.close();
							this.onSubmit({ pastOption: 0, attached: this.attachedAfterToggle });
						});
				});
		}

		new Setting(contentEl)
			.addButton((b) => {
				b.setButtonText("Cancel")
					.onClick(() => {
						this.close();
					});
			});

	}
	onClose(): void {
		this.contentEl.empty();
	}
}
