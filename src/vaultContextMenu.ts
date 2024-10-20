import { around } from "monkey-around";
import { TFolder } from "obsidian";
import type { FileExplorerView } from "obsidian-typings";
import { InternalPluginName } from 'obsidian-typings/implementations';

type OpenFileCM = FileExplorerView['openFileContextMenu']
type OpenFileCMArgs = Parameters<OpenFileCM>

let fileExplorerView: FileExplorerView
export let uninstaller: () => void;

export function registerVaultContextMenu() {
    fileExplorerView = this.app.workspace.getLeavesOfType(InternalPluginName.FileExplorer)[0].view;

    uninstaller = openFileContextMenuWrapper()

    this.register(uninstaller);

    const vaultSwitcherEl = document.querySelector<HTMLElement>('.workspace-drawer-vault-switcher');
    if (vaultSwitcherEl) {
        fileExplorerView.files.set(vaultSwitcherEl, this.app.vault.getRoot());
        this.registerDomEvent(vaultSwitcherEl, 'contextmenu', async (ev: MouseEvent): Promise<void> => {
            fileExplorerView.openFileContextMenu(ev, vaultSwitcherEl.childNodes[0] as HTMLElement);
            document.body.click();
        });
    }
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

