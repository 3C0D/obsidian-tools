import * as path from "path";
import * as os from "os";
import { App, Notice, Platform } from "obsidian";
import { readFileSync } from "fs";
import { VaultChooser } from "./vaultsModal.ts";
import { migrateProfile } from "./migratetProfile.ts";

export async function picker(message: string, properties: string[]): Promise<string | string[] | undefined> {
    const dirPath = (window.electron as any).remote.dialog.showOpenDialogSync({
        title: message,
        properties
    });
    if (!dirPath) return;
    if (properties.includes("multiSelections")) return dirPath;
    else return dirPath[0];
}

export async function openDirectoryInFileManager(dirPath: string): Promise<void> {
    try {
        await (window.electron as any).remote.shell.openPath(dirPath);
    } catch (err) {
        console.error(err);
    }
}


function getVaultsConfigPath(): string | null {
    const userDir: string = os.homedir();
    if (Platform.isWin) {
        return path.join(userDir, 'AppData', 'Roaming', 'obsidian', 'obsidian.json');
    } else if (Platform.isMacOS) {
        return path.join(userDir, 'Library', 'Application Support', 'obsidian', 'obsidian.json');
    } else if (Platform.isLinux) {
        return path.join(userDir, '.config', 'obsidian', 'obsidian.json');
    } else {
        console.error("platform not supported");
        new Notice("platform not supported");
        return null;
    }
}


interface Vault {
    path: string;
    ts: number;
    open?: boolean;
}

interface ObsidianJsonConfig {
    vaults: Record<string, Vault>;
    insider?: boolean;
}

function readObsidianConfig(): ObsidianJsonConfig | null {
    try {
        const vaultsConfigPath = getVaultsConfigPath();
        if (vaultsConfigPath) {
            const vaultsConfigContent = JSON.parse(readFileSync(vaultsConfigPath, "utf8"));
            return vaultsConfigContent as ObsidianJsonConfig;
        } else {
            return null;
        }
    } catch (err) {
        if (err instanceof SyntaxError) {
            console.error("Invalid JSON format in obsidian.json");
        } else if (err instanceof Error) {
            console.error("Error reading obsidian.json:", err.message);
        }
        return null;
    }
}

export function getVaultPaths(app: App): string[] {
    const obsidianConfig = readObsidianConfig();
    const currentVaultPath = app.vault.adapter.basePath;
    if (obsidianConfig) {
        const paths: string[] = [];
        for (const key in obsidianConfig.vaults) {
            if (Object.prototype.hasOwnProperty.call(obsidianConfig.vaults, key) && obsidianConfig.vaults[key].path !== currentVaultPath) {
                paths.push(obsidianConfig.vaults[key].path);
            }
        }
        return paths;
    }
    return [];
}

export function showVaultChooserModal(app: App, isImport: boolean): void {
    new VaultChooser(app, isImport, (result) => {
        migrateProfile(this, app, isImport, result).catch((error) => {
            console.error(`Error during ${isImport ? 'import' : 'export'}:`, error);
        });
    }).open();
}
