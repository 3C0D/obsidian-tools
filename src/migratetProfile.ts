import * as path from "path";
import * as fs from "fs-extra";
import { picker } from "./utils";
import { existsSync } from "fs-extra";
import { Notice } from "obsidian";
import Tools from "./main";
import { setMigrateOptions } from "./migrateProfileModal";

export async function migrateProfile(plugin: Tools, isImport = true, customPath?: string): Promise<void> {
    try {
        const sourceOrDest = customPath ? path.join(customPath, '.obsidian') : await getVaultDir('.obsidian', isImport);
        if (!sourceOrDest) return

        const action = isImport ? 'Import' : 'Export';
        const res = await setMigrateOptions(plugin, sourceOrDest, `${action} vault options`, isImport);

        if (res) {
            await Promise.all([
                importOrExportDirs(plugin, sourceOrDest, isImport),
                importOrExportJsons(plugin, sourceOrDest, isImport)
            ]);

            if (isImport) {
                // reload app
                new Notice("Success!, App will reload...")
                setTimeout(async () => {
                    await this.app.commands.executeCommandById("app:reload")
                }, 1500);
            } else {
                new Notice(`${action} operations finished successfully`);
            }
        }
    } catch (error) {
        console.error('Error during profile migration:', error);
        new Notice(`Error during ${isImport ? 'import' : 'export'}: ${error.message}`);
    }
}

async function getVaultDir(complement: string, isImport = true): Promise<string | null> {
    const action = isImport ? 'source' : 'destination';
    const dir = await picker(`Select ${action} vault folder`, ['openDirectory']);
    if (!dir) return null;

    const dirPath = path.join(dir as string, complement);
    if (!existsSync(dirPath)) {
        new Notice('Select a valid vault folder!', 2500);
        return null;
    }
    return dirPath;
}

async function importOrExportDirs(plugin: Tools, dirPath: string, isImport = true): Promise<void> {
    const obsidian = this.app.vault.adapter.getFullPath(".obsidian")
    const { vaultDirs } = plugin.settings

    for (const [key, isEnabled] of Object.entries(vaultDirs)) {
        if (!isEnabled) continue;

        const srcDir = isImport ? path.join(dirPath, key) : path.join(obsidian, key);
        const destination = isImport ? path.join(obsidian, key) : path.join(dirPath, key);

        try {
            if (key === 'plugins') {
                await copyPlugins(srcDir, destination);
            } else {
                await fs.copy(srcDir, destination);
            }
        } catch (err) {
            console.error(`Error copying ${key}:`, err);
        }
    }
}

async function copyPlugins(src: string, dest: string): Promise<void> {
    await fs.ensureDir(dest);
    const files = await fs.readdir(src);

    for (const file of files) {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        const fileStats = await fs.stat(srcPath);

        if (fileStats.isDirectory() && file !== 'node_modules') {
            await copyPlugins(srcPath, destPath);
        } else if (fileStats.isFile()) {
            await fs.copy(srcPath, destPath);
        }
    }
}

async function importOrExportJsons(plugin: Tools, dirPath: string, isImport = true): Promise<void> {
    const obsidian = this.app.vault.adapter.getFullPath(".obsidian")
    const { vaultFiles } = plugin.settings;

    for (const [key, isEnabled] of Object.entries(vaultFiles)) {
        if (!isEnabled) continue;

        const sourcePath = isImport ? path.join(dirPath, `${key}.json`) : path.join(obsidian, `${key}.json`);
        const destinationPath = isImport ? path.join(obsidian, `${key}.json`) : path.join(dirPath, `${key}.json`);

        try {
            const sourceContent = await fs.readJson(sourcePath);
            let destinationContent = {};

            if (await fs.pathExists(destinationPath)) {
                destinationContent = await fs.readJson(destinationPath);
            }

            const mergedContent = { ...destinationContent, ...sourceContent };
            await fs.writeJson(destinationPath, mergedContent, { spaces: 2 });
        } catch (error) {
            console.error(`Error processing ${key}.json:`, error);
        }
    }
}

