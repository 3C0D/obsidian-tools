import { around } from "monkey-around";
import { App, Menu, Notice, TAbstractFile, TFolder } from "obsidian";
import type { FileExplorerView } from "obsidian-typings";
import { InternalPluginName } from 'obsidian-typings/implementations';
import { registerDeleteFoldersByName } from "./delete-folders-by-name/delete-folders-by-name.ts";
import { deleteEmptyFolders } from "./delete-empty-folders/delete-empty-folders.ts";

type OpenFileCM = FileExplorerView['openFileContextMenu']
type OpenFileCMArgs = Parameters<OpenFileCM>

let fileExplorerView: FileExplorerView;
export let uninstaller: () => void;

/**
 * Check for conflicting plugin and show warning
 */
export function checkForConflictingPlugin(app: App): void {
    const conflictingPlugin = app.plugins.getPlugin('root-folder-context-menu');
    if (conflictingPlugin) {
        new Notice(
            '⚠️ Warning: "Root Folder Context Menu" plugin is already enabled. ' +
            'Obsidian Tools provides the same functionality with a menu adapted to Obsidian Tools features. ' +
            'Consider disabling "Root Folder Context Menu" to avoid conflicts. ' +
            'After disabling it, you may need to toggle this setting OFF then ON again.',
            10000
        );
    }
}

export function registerVaultContextMenu(): void {
    // Check for conflicting plugin
    checkForConflictingPlugin(this.app);

    fileExplorerView = this.app.workspace.getLeavesOfType(InternalPluginName.FileExplorer)[0].view;

    uninstaller = openFileContextMenuWrapper();

    this.register(uninstaller);

    const vaultSwitcherEl = document.querySelector<HTMLElement>('.workspace-drawer-vault-switcher');
    if (vaultSwitcherEl && fileExplorerView.files && !fileExplorerView.files.has(vaultSwitcherEl)) {
        fileExplorerView.files.set(vaultSwitcherEl, this.app.vault.getRoot());
        this.registerDomEvent(vaultSwitcherEl, 'contextmenu', async (ev: MouseEvent): Promise<void> => {
            fileExplorerView.openFileContextMenu(ev, vaultSwitcherEl.childNodes[0] as HTMLElement);
            document.body.click();
        });
    }

    // Register event to filter unnecessary actions for root folder
    this.registerEvent(this.app.workspace.on('file-menu', handleFileMenuEvent));
}

function openFileContextMenuWrapper(): () => void {
    return around(Object.getPrototypeOf(fileExplorerView), {
        openFileContextMenu(old: OpenFileCM): OpenFileCM {
            return function (...args: OpenFileCMArgs): void {
                if (!fileExplorerView) return old.apply(this, args);
                const file = this.files?.get(args[1]?.parentElement);
                if (!file || !(file instanceof TFolder)) {
                    return old.apply(this, args);
                }
                // Temporarily override isRoot
                const originalIsRoot = file.isRoot;
                file.isRoot = (): boolean => false;
                old.apply(this, args);
                file.isRoot = originalIsRoot;
            };
        }
    });
}

/**
 * Filter out unnecessary actions when right-clicking on root folder
 * Uses action IDs for more robust filtering instead of text content
 */
function handleFileMenuEvent(menu: Menu, file: TAbstractFile): void {
    if (file.path !== '/') {
        return;
    }

    // Utiliser les mêmes clés de localisation que le plugin original
    const localizationKeys = [
        'plugins.file-explorer.action-move-folder',
        'plugins.file-explorer.menu-opt-delete',
        'plugins.file-explorer.menu-opt-make-copy',
        'plugins.file-explorer.menu-opt-rename',
        'plugins.search.menu-opt-search-in-folder'
    ];

    // Obtenir les titres localisés
    const localizedTitles = localizationKeys.map((key) => 
        window.i18next.t(key)
    );

    // Filtrer les éléments de menu indésirables
    menu.items = menu.items.filter((item) => 
        !localizedTitles.includes(item.titleEl?.textContent ?? '')
    );

    // Add "Delete folders by name" option if the feature is enabled
    const plugin = (window as any).app.plugins.plugins["obsidian-my-tools"];
    if (plugin && plugin.settings["delete-folders-by-name"]) {
        menu.addSeparator();
        menu.addItem((item) => {
            item
                .setTitle("Delete folders by name")
                .setIcon("trash-2")
                .onClick(() => registerDeleteFoldersByName(this.app));
        });
    }
    
    // Add "Delete empty folders" option if the feature is enabled
    if (plugin && plugin.settings["delete-empty-folders"]) {
        menu.addSeparator();
        menu.addItem((item) => {
            item
                .setTitle("Delete empty folders")
                .setIcon("trash-2")
                .onClick(async () => await deleteEmptyFolders(this.app));
        });
    }
}

