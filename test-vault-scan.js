// Test script to verify the vault scanning improvements
const fs = require('fs-extra');
const path = require('path');

// Simulate the getDefaultFileState function
function getDefaultFileState(fileName) {
    const commonFiles = [
        'app', 'appearance', 'core-plugins', 'community-plugins', 
        'hotkeys', 'workspace', 'graph', 'command-palette',
        'daily-notes', 'templates', 'types'
    ];
    
    const optionalFiles = [
        'core-plugins-migration', 'plugins'
    ];
    
    if (commonFiles.includes(fileName)) {
        return true;
    } else if (optionalFiles.includes(fileName)) {
        return false;
    } else {
        return true;
    }
}

// Simulate the scanning logic
async function testVaultScan(obsidianPath) {
    try {
        console.log(`Scanning: ${obsidianPath}`);
        
        if (!await fs.pathExists(obsidianPath)) {
            console.log('Path does not exist');
            return;
        }
        
        const items = await fs.readdir(obsidianPath, { withFileTypes: true });
        
        // Scan files
        const jsonFiles = items
            .filter(item => item.isFile() && path.extname(item.name) === '.json')
            .map(item => path.parse(item.name).name);
            
        // Scan directories
        const directories = items
            .filter(item => item.isDirectory())
            .map(item => item.name);
        
        console.log('\n=== JSON Files Found ===');
        jsonFiles.forEach(file => {
            const defaultState = getDefaultFileState(file);
            console.log(`${file}.json - Default: ${defaultState ? 'ON' : 'OFF'}`);
        });
        
        console.log('\n=== Directories Found ===');
        directories.forEach(dir => {
            const defaultState = dir !== 'plugins';
            console.log(`${dir}/ - Default: ${defaultState ? 'ON' : 'OFF'}`);
        });
        
        console.log(`\nTotal: ${jsonFiles.length} files, ${directories.length} directories`);
        
    } catch (error) {
        console.error('Error scanning:', error.message);
    }
}

// Test with the actual vault path
const vaultPath = 'C:/Users/dd200/Documents/obsidian_vaults/Portable/.obsidian';
testVaultScan(vaultPath);
