import { App, PluginSettingTab, Setting } from "obsidian";
import type Tools from "./main";
import { settingsList } from "./types/variables";
import { ToggleElement, toToggle } from "./types/global";

export class ToolsSettingTab extends PluginSettingTab {
    plugin: Tools;

    constructor(app: App, plugin: Tools) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl: El } = this;
        El.empty();
        El.createEl("h2", { text: "Tools" });
        this.addSettingsToggleHandlers(El, settingsList)
    }

    addSettingsToggleHandlers(El: HTMLElement, settingsList: ToggleElement[]) {
        for (const el of settingsList) {
            const setting = new Setting(El)
            setting
                .addToggle((toggle) => {
                    toggle
                        .setValue(this.plugin.settings[el.setting as keyof toToggle])
                        .onChange(async (value) => {
                            this.plugin.settings[el.setting as keyof toToggle] = value
                            await this.plugin.saveSettings()
                            await el.callback.call(this, this.app, this.plugin, value)
                        })
                }).setName(el.name)
        }
    }
}

