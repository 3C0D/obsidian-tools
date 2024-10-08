import { App, Notice, TFile, TFolder } from "obsidian";
import { OutFromVaultConfirmModal } from "./out-of-vault-confirm_modal";
import * as fs from "fs-extra";
import * as path from "path";
import { openDirectoryInFileManager, picker } from "src/utils";

// Constants
const MOVE_MESSAGE = "Move out of Vault: select directory";
const COPY_MESSAGE = "Copy out of Vault: select directory";

interface FileOperationResult {
	success: boolean;
	error?: string;
}

export async function moveOutOfVault(app: App, files: (TFile | TFolder)[], job: "move" | "copy"): Promise<void> {
	const msg = job === "move" ? MOVE_MESSAGE : COPY_MESSAGE;
	const selectedPaths = await picker(msg, ["openDirectory"]) as string;
	if (!selectedPaths || !selectedPaths.length) return;

	let runModal = false;
	const attached = new Set<TFile>();

	for (const file of files) {
		const links = await hasResolvedLinks(app, file)
		links.forEach((link) => attached.add(link));
		if (await fileAlreadyInDest(app, file, selectedPaths)) {
			runModal = true;
		}
	}

	if (runModal || attached.size > 0) {
		new OutFromVaultConfirmModal(app, true, Array.from(attached), async (result) => {
			if (!result) {
				return;
			}
			await handler(app, result, files, selectedPaths, job === "move");
			await openDirectoryInFileManager(selectedPaths);
		}).open();
	} else {
		await withoutModal(app, files, selectedPaths, job === "move");
		await openDirectoryInFileManager(selectedPaths);
	}
}

async function hasResolvedLinks(app: App, file: TFile | TFolder): Promise<TFile[]> {
	if (file instanceof TFolder) return [];
	const fileLinks: Record<string, number> = app.metadataCache.resolvedLinks[file.path]
	const paths = Object.keys(fileLinks)
	if (!paths.length) return [];

	const LinkFiles: TFile[] = [];
	for (const path of paths) {
		const linkFile = app.vault.getFileByPath(path);
		if (linkFile) LinkFiles.push(linkFile);
	}

	return LinkFiles;
}

async function fileAlreadyInDest(app: App, file: TFile | TFolder, selectedPaths: string): Promise<boolean> {
	const { destinationPath } = getDestinationPath(app, file, selectedPaths);
	return fs.pathExists(destinationPath);
}

async function withoutModal(app: App, files: (TFile | TFolder)[], selectedPaths: string, move: boolean): Promise<void> {
	for (const file of files) {
		await simpleCopy(app, file, selectedPaths, move);
	}
	new Notice(`File(s) ${move ? 'moved' : 'copied'} to ${selectedPaths}`, 4000);
}

async function simpleCopy(app: App, file: TFile | TFolder, selectedPaths: string, move: boolean): Promise<void> {
	const { filePath, destinationPath } = getDestinationPath(app, file, selectedPaths);
	try {
		await fs.copy(filePath, destinationPath);
		if (move) {
			await app.vault.trash(file, true);
		}
	} catch (error) {
		console.error(`Error during file operation: ${error}`);
		new Notice(`Failed to ${move ? 'move' : 'copy'} ${file.name}`, 4000);
	}
}

async function handler(app: App, result: { pastOption: number; attached: TFile[] }, files: (TFile | TFolder)[], selectedPaths: string, move: boolean): Promise<void> {
	const allFiles = [...new Set([...files, ...result.attached])];
	for (const file of allFiles) {
		await moveItem(app, file, selectedPaths, result.pastOption, move);
	}
	new Notice(`File(s) ${move ? 'moved' : 'copied'} to ${selectedPaths}`, 4000);
}

async function moveItem(app: App, file: TFile | TFolder, selectedPaths: string, pastOption: number, move: boolean): Promise<void> {
	const { filePath, fileName, destinationPath } = getDestinationPath(app, file, selectedPaths);
	await makeCopy(app, file, fileName, selectedPaths, filePath, destinationPath, pastOption, move);
}

function getDestinationPath(app: App, file: TFile | TFolder, selectedPaths: string): { filePath: string; fileName: string; destinationPath: string } {
	const filePath = app.vault.adapter.getFullPath(file.path);
	const fileName = path.basename(filePath);
	const destinationPath = path.join(selectedPaths, fileName);
	return { filePath, fileName, destinationPath };
}

async function makeCopy(app: App, file: TFile | TFolder, fileName: string, selectedPaths: string, normalizedFullPath: string, destinationPath: string, choice: number, move: boolean): Promise<FileOperationResult> {
	try {
		if (choice === 2) {
			destinationPath = await getIncrementedFilePath(selectedPaths, fileName);
		}
		await fs.copy(normalizedFullPath, destinationPath);
		if (move) {
			await app.vault.trash(file, true);
		}
		return { success: true };
	} catch (error) {
		console.error(`Error during file operation: ${error}`);
		return { success: false, error: String(error) };
	}
}

export async function getIncrementedFilePath(selectedPaths: string, fileName: string): Promise<string> {
	const { name: baseFileName, ext: extension } = path.parse(fileName);
	const regex = /^(.*) \((\d+)\)$/;
	const match = baseFileName.match(regex);

	let versionedFileName: string;
	let version = 1;

	if (match) {
		versionedFileName = `${match[1]} (${parseInt(match[2]) + 1})${extension}`;
	} else {
		versionedFileName = `${baseFileName} (${version})${extension}`;
		while (await fs.pathExists(path.join(selectedPaths, versionedFileName))) {
			version++;
			versionedFileName = `${baseFileName} (${version})${extension}`;
		}
	}

	return path.join(selectedPaths, versionedFileName);
}
