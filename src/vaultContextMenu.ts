import { around } from "monkey-around";
import { App, Menu, Notice, TAbstractFile, TFolder } from "obsidian";
import type { FileExplorerView } from "obsidian-typings";
import { InternalPluginName } from 'obsidian-typings/implementations';

type OpenFileCM = FileExplorerView['openFileContextMenu']
type OpenFileCMArgs = Parameters<OpenFileCM>

let fileExplorerView: FileExplorerView
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

export function registerVaultContextMenu() {
    // Check for conflicting plugin
    checkForConflictingPlugin(this.app);

    fileExplorerView = this.app.workspace.getLeavesOfType(InternalPluginName.FileExplorer)[0].view;

    uninstaller = openFileContextMenuWrapper()

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

function openFileContextMenuWrapper() {
    return around(Object.getPrototypeOf(fileExplorerView), {
        openFileContextMenu(old: OpenFileCM): OpenFileCM {
            return function (...args: OpenFileCMArgs): void {
                if (!fileExplorerView) return old.apply(this, args)
                const file = this.files?.get(args[1]?.parentElement);
                if (!file || !(file instanceof TFolder)) {
                    return old.apply(this, args);
                }
                // Temporarily override isRoot
                const originalIsRoot = file.isRoot;
                file.isRoot = () => false;
                old.apply(this, args);
                file.isRoot = originalIsRoot;
            }
        }
    })
}

/**
 * Filter out unnecessary actions when right-clicking on root folder
 * Uses action IDs for more robust filtering instead of text content
 */
function handleFileMenuEvent(menu: Menu, file: TAbstractFile): void {
    if (file.path !== '/') {
        return;
    }

    // Action IDs for the specific actions to remove: "Make a copy" and "Rename..."
    const actionIdsToRemove = [
        'file-explorer:duplicate-file',  // Make a copy
        'file-explorer:rename-file'      // Rename...
    ];

    // Filter out the unwanted menu items by checking their action IDs
    menu.items = menu.items.filter((item) => {
        // Check if the item has an action ID that we want to remove
        const actionId = (item as any).actionId || (item as any).id;
        if (actionId && actionIdsToRemove.includes(actionId)) {
            return false;
        }

        // Fallback: also check by text content for robustness
        const localizationKeys = [
            'plugins.file-explorer.menu-opt-make-copy',
            'plugins.file-explorer.menu-opt-rename'
        ];
        const localizedTitles = localizationKeys.map((key) => (window as any).i18next?.t(key) || key);
        const commonTitles = ['Make a copy', 'Rename...'];
        const titlesToRemove = [...localizedTitles, ...commonTitles];

        let itemText = '';
        if (typeof item.titleEl === 'string') {
            itemText = item.titleEl;
        } else if (item.titleEl && typeof item.titleEl === 'object' && 'textContent' in item.titleEl) {
            itemText = (item.titleEl as any).textContent || '';
        }
        itemText = itemText.trim();

        return !titlesToRemove.includes(itemText);
    });
}

