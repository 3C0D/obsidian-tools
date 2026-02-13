**# obsidian-tools**

## 🚀 Import/Export Vault Profile

A comprehensive system for transferring vault configurations between different Obsidian installations with intelligent conflict detection and safety features.

### ✨ Key Features

**📦 Selective Import/Export**
- Choose exactly what to transfer: themes, snippets, plugins, preferences, hotkeys, workspace layouts, and more
- Smart defaults with the ability to customize every aspect of the transfer
- Existing files and folders are updated intelligently (sync-like behavior)

**🛡️ Smart Plugin Conflict Detection**
- **Version Conflict Detection**: Automatically identifies when source plugins have lower versions than destination
- **Development Plugin Support**: Detects dev plugins (with node_modules) and handles them appropriately
- **Contextual Warnings**: Shows specific warnings based on the type of conflict and operation direction
- **Auto-deselection**: Conflicted plugins are automatically deselected for safety, with clear explanations

**🎯 Intelligent User Interface**
- **Visual Indicators**: Color-coded warnings (orange for version conflicts, red for critical issues)
- **Detailed Information**: Shows plugin versions, types (dev/normal), and potential conflicts
- **Global Overview**: Conflict counter shows total number of problematic plugins at a glance
- **Conditional Language**: Uses "may" instead of "will" for accurate conditional warnings

### 🔧 How It Works

**Import Process**: Source Vault → Current Vault
- Select a source vault from detected Obsidian installations or browse manually
- Review detected configurations with smart conflict analysis
- Choose specific plugins with full conflict information
- Safe transfer with automatic backup of conflicted items

**Export Process**: Current Vault → Destination Vault
- Select destination vault from available installations
- Analyze potential conflicts at destination
- Export selected configurations with safety checks
- Preserve development work with dev plugin detection

### 🛠️ Advanced Plugin Management

**Development Plugin Detection**
- Automatically detects development plugins by checking for `node_modules` folders
- Provides specific warnings when dev plugins might be overwritten
- Excludes `node_modules` from transfers for faster operations[^1]
- Protects against accidental loss of development work

**Conflict Scenarios Handled**
- **Lower Version Warning**: When importing/exporting older plugin versions
- **Dev → Normal**: When development plugins would overwrite normal installations
- **Normal → Dev**: When normal plugins would overwrite development versions
- **Dev → Dev**: When development plugins would overwrite other development versions

### 💡 Usage Tips

- **For Developers**: Development plugins are clearly marked and protected from accidental overwrites
- **For Users**: Version conflicts are highlighted to prevent downgrading plugins
- **For Teams**: Safe sharing of vault configurations with conflict prevention
- **For Backup**: Reliable vault profile backup and restoration system

### 📋 Example Interface

**Plugin Selection Modal**
```
Export Plugin Selection

⚠️ Warning: 3 plugins may cause conflicts and have been deselected.
Dev plugins: plugins in development.

Select which plugins you want to export.

❌ Comments • Lower version • Dev plugin
   Version: 1.0.3 vs 1.0.4 (destination) • ⚠️ May overwrite development plugin at destination

✅ Dataview
   Version: 0.5.68

❌ Custom Plugin • Dev plugin
   Version: 2.1.0 vs 2.0.0 (destination) • ⚠️ May overwrite normal plugin with development plugin
```

**Key Interface Elements**
- 🔴 **Red warnings**: Critical conflicts requiring attention
- 🟠 **Orange indicators**: Version conflicts (lower version warnings)
- ❌ **Auto-deselected**: Conflicted plugins are unchecked by default
- ✅ **Safe selections**: Non-conflicted plugins ready for transfer
- 📊 **Version comparison**: Clear source vs destination version display
- 🏷️ **Plugin types**: "Dev plugin" labels for development installations

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

## Copy text without markdown:
- Copy selected text from your notes without any Markdown formatting
- Removes all Markdown syntax: headings (#), bold (**), italic (*), code (`), links, images, etc.
- Handles Obsidian-specific syntax: wiki links ([[...]]), embeds (![[...]]), block IDs (^abc)
- Supports code blocks with 3-5 backticks
- Especially useful for pasting into chat applications like Claude, avoiding extension conflicts that can cause freezing
- **Recommended hotkey**: Ctrl+Shift+C (or Cmd+Shift+C on Mac)
- Access via command palette: "Copy text without markdown"

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