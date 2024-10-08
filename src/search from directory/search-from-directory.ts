import { App, Editor, Menu, MenuItem, TFolder } from "obsidian";

export function registerSFD(app: App) {
  this.registerEvent(app.workspace.on("file-menu", SfdToFileMenuCb(app)));
  this.registerEvent(app.workspace.on("editor-menu", SfdToEditorMenuCb(app)));
}

export function SfdToFileMenuCb(app: App) {
  return (menu: Menu, folder: TFolder) => {
    if (!(folder instanceof TFolder)) return;
    menu.addSeparator();
    menu.addItem((item: MenuItem) => {
      item
        .setTitle("Search in folder")
        .setIcon("search")
        .onClick(async () => {
          await searchDir(app, folder);
        });
    });
  }
}

export function SfdToEditorMenuCb(app: App) {
  return (menu: Menu, editor: Editor) => {
    menu.addItem((item) => {
      item
        .setTitle("search in parent directory")
        .setIcon("search")
        .onClick(async () => {
          const selection = editor.getSelection();
          await searchDir(app, null, selection, true);
        });
    });
  }
}

async function searchDir(app: App, folder: TFolder | null, selection = "", select = false) {
  let prefix;
  const { workspace } = app

  if (folder) {
    const folderPath = folder.path;
    prefix = `path:"${folderPath}" `;
  } else {
    const filePath = workspace.getActiveFile()?.path;
    const folderPath = filePath?.split("/").slice(0, -1).join("/");
    if (folderPath !== filePath) {
      prefix = `path:"${folderPath}" `;
    } else {
      prefix = "";//root
    }
  }

  (app.internalPlugins.getPluginById("global-search")?.instance as any)?.openGlobalSearch(prefix + selection);


  // ensure text has been entered into the search input
  const searchLeaf = workspace.getLeavesOfType('search')[0];
  await searchLeaf.open(searchLeaf.view);

  const searchInput = document.querySelector(
    ".search-input-container input"
  ) as HTMLInputElement;
  if (select) {
    selectInput(
      searchInput,
      prefix.length,
      searchInput.value.length
    );

  } else {
    selectInput(
      searchInput,
      prefix.length,
      prefix.length
    );
  }
}

function selectInput(searchInput: HTMLInputElement, start: number, end: number) {
  searchInput.setSelectionRange(start, end);
}
