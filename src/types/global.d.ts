import { App } from "obsidian";
import type Tools from "../main.ts";

declare module "obsidian-typings" {
  interface toToggle {
    "move-out-from-vault": boolean;
    "import-to-vault": boolean;
    "search-from-directory": boolean; // Kept for backward compatibility, now native in Obsidian
    "vault-context-menu": boolean;
  }

  interface ToolsSettings extends toToggle {
    vaultDirs: Record<string, boolean>,
    vaultFiles: Record<string, boolean>
  }

  interface ToggleElement {
    setting: string;
    callback: (app: App, plugin: Tools, value: boolean) => Promise<void>;
    name: string;
  }
}

export type ConfirmCallback = (confirmed: boolean) => void;