**# obsidian-tools**

## Import/export Vault Profile:
- You can check what you want to import/export. Mainly: themes, snippets, plugins[^1], prefs, hotkeys,...
- Existing JSON files and folders are updated. Kind of sync...

## Move/Copy File(s)/Dir(s) out of Vault[^2][^3]:
- With options to replace or increment existing file(s)/dir(s) and to copy resolved links at the same time (md, jpg...).

## Import to folder:
- Move/Copy File(s)/Dir(s) To Vault or folder (folder context menu) with options to replace or increment existing file(s)/dir(s)
- You can find the menu on folders
- You can use the added vault switcher context menu to import to root.
- Or the command Move/Copy File(s)/Dir(s) To Vault in palette.

## Root context menu on vault switcher:
- Inspired on Root Folder Context Menu plugin, you can have the file context menu of the vault root folder on the vault switcher.

## Delete folders by name:
- Delete all folders with the same name across your vault
- Select any folder from the suggester - the operation will target all folders with that same name
- Shows both path and folder name in the suggester for clarity
- Includes detailed confirmation dialog explaining exactly what will be deleted
- All matching folders are moved to trash, regardless of their location in the vault

## Search folders:
- Find all folders with the same name across your vault
- Shows folder content information (empty or number of files/subfolders)
- Double-click on a folder to reveal it in the explorer

## Delete empty folders:
- Recursively find and delete all empty folders in your vault or within a specific folder
- Use the command palette to clean empty folders from the entire vault
- Use the folder context menu to clean empty folders within a specific directory
- Shows a confirmation dialog with checkboxes for each empty folder found
- All selected empty folders are moved to trash

## Additional features
- ~~Search from directory~~ (Now native in Obsidian)
- Each part of the plugin can be disabled in settings.

[^1]: For developpers, copying plugins won't copy node-modules folders, so cloned repo will be copied super fast.
[^2]: You can select several files holding alt.
[^3]: The destination folder is opened at the end to check results...


## Development (Add this to your README)

Automate the development and publication processes on github, including releases. You are supposed to git clone your plugin out of the vault and set the right path in the .env file (1 for your trying vault, 1 for the real vault).

If you want more options like sass, check out other branches

### Environment Setup

- **Development in the plugins folder of your vault:**
  - Set the `REAL` variable to `-1` in the `.env` file. Or delete the file. Run the usual npm commands.

- **Development outside the vault:**
  - If your plugin's source code is outside the vault, the necessary files will be automatically copied to the targeted vault. Set the paths in the .env file. Use TestVault for the development vault and RealVault to simulate production.

- **other steps:**
  - You can then do `npm run version` to update the version and do the push of the changed files (package, manifest, version). Prompts will guide you.

  - You can then do `npm run release` to create the release. Few seconds later you can see the created release in the GitHub releases.

### Available Commands

*I recommend a `npm run start` then `npm run bacp` then `npm run version` then `npm run release`. Super fast and easy.*

- **`npm run dev` and `npm start`**: For development.
  `npm start` opens Visual Studio Code, runs `npm install`, and then `npm run dev`

- **`npm run build`**: Builds the project in the folder containing the source code.

- **`npm run real`**: Equivalent to a traditional installation of the plugin in your REAL vault.

- **`npm run bacp`** & **`npm run acp`**: `b` stands for build, and `acp` stands for add, commit, push. You will be prompted for the commit message.

- **`npm run version`**: Asks for the type of version update, modifies the relevant files, and then performs an add, commit, push.

- **`npm run release`**: Asks for the release title, creates the release. This command works with the configurations in the `.github` folder. The release title can be multiline by using `\n`.