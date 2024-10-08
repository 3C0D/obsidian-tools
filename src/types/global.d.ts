import { App } from "obsidian";
import Tools from "src/main";

interface toToggle {
    "move-out-from-vault": boolean;
    "move-to-vault": boolean;
    "search-from-directory": boolean;
}

interface ToolsSettings extends toToggle {
    vaultDirs: Record<string, boolean>,
    vaultFiles: Record<string, boolean>
}

export interface ToggleElement {
    setting: string;
    callback: (app: App, plugin: Tools, value: boolean) => Promise<void>;
    name: string;
}

export type ConfirmCallback = (confirmed: boolean) => void;