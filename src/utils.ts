import * as path from "path";
import * as os from "os";
import { App, Notice, Platform } from "obsidian";
import { readFileSync } from "fs"
import { VaultChooser } from "./vaultsModal";
import { migrateProfile } from "./migratetProfile";

declare global {
    interface Window {
        electron: any;
        require: NodeRequire;
    }
}

export async function picker(message: string, properties: string[]) {
    const dirPath = window.electron.remote.dialog.showOpenDialogSync({
        title: message,
        properties
    });
    if (!dirPath) return
    if (properties.includes("multiSelections")) return dirPath
    else return dirPath[0];
}

export async function openDirectoryInFileManager(dirPath: string) {
    const shell = window.electron.remote.shell;
    try {
        await shell.openPath(dirPath);
    } catch (err) {
        console.log(err);
    }
}


function getVaultsConfig(): string | null {
    const userDir: string = os.homedir();
    if (Platform.isWin) {
        return path.join(userDir, 'AppData', 'Roaming', 'obsidian', 'obsidian.json');
    } else if (Platform.isMacOS) {
        return path.join(userDir, 'Library', 'Application Support', 'obsidian', 'obsidian.json');
    } else if (Platform.isLinux) {
        return path.join(userDir, '.config', 'obsidian', 'obsidian.json');
    } else {
        console.error("platform not supported")
        new Notice("platform not supported")
        return null
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

function readObsidianJson(): ObsidianJsonConfig | null {
    try {
        const vaultsConfigPath = getVaultsConfig();
        if (vaultsConfigPath) {
            const vaultsConfigContent = JSON.parse(readFileSync(vaultsConfigPath, "utf8"));
            console.log("vaultsConfigContent", vaultsConfigContent)
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
    const obsidianConfig = readObsidianJson();
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

export function openVaultChooser(app: App, isImport: boolean) {
    new VaultChooser(app, isImport, (result) => {
        migrateProfile(this, app, isImport, result).catch((error) => {
            console.error(`Error during ${isImport ? 'import' : 'export'}:`, error);
        });
    }).open();
}