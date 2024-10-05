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

export async function movOpenFileExplorer(
	files: (TFile | TFolder)[],
	job: "move" | "copy"
): Promise<void> {
	const msg = job === "move" ? MOVE_MESSAGE : COPY_MESSAGE;
	const selectedPath = await picker(msg, ["openDirectory"]) as string;
	if (!selectedPath) return;

	let runModal = false;
	const attached = new Set<TFile>();

	for (const file of files) {
		const links = await hasResolvedLinks(file)
		links.forEach((link) => attached.add(link));
		if (await fileAlreadyInDest(file, selectedPath)) {
			runModal = true;
		}
	}

	if (runModal || attached.size > 0) {
		new OutFromVaultConfirmModal(this.app, runModal, Array.from(attached), async (result) => {
			if (!result) {
				return;
			}
			await handler(this.app, result, files, selectedPath, job === "move");
			await openDirectoryInFileManager(selectedPath);
		}).open();
	} else {
		await withoutModal(this.app, files, selectedPath, job === "move");
		await openDirectoryInFileManager(selectedPath);
	}
}

async function hasResolvedLinks(file: TFile | TFolder): Promise<TFile[]> {
	if (file instanceof TFolder) return [];
	const fileLinks: Record<string, number> = this.app.metadataCache.resolvedLinks[file.path]
	const paths = Object.keys(fileLinks)
	if (!paths.length) return [];

	const LinkFiles: TFile[] = [];
	for (const path of paths) {
		const linkFile = this.app.vault.getFileByPath(path);
		if (linkFile) LinkFiles.push(linkFile);
	}

	return LinkFiles;
}

async function fileAlreadyInDest(
	file: TFile | TFolder,
	selectedPath: string
): Promise<boolean> {
	const { destinationPath } = getDestinationPath(file, selectedPath);
	return fs.pathExists(destinationPath);
}

async function withoutModal(
	app: App,
	files: (TFile | TFolder)[],
	selectedPath: string,
	move: boolean
): Promise<void> {
	for (const file of files) {
		await simpleCopy(app, file, selectedPath, move);
	}
	new Notice(`File(s) ${move ? 'moved' : 'copied'} to ${selectedPath}`, 4000);
}

async function simpleCopy(
	app: App,
	file: TFile | TFolder,
	selectedPath: string,
	move: boolean
): Promise<void> {
	const { filePath, destinationPath } = getDestinationPath(file, selectedPath);
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

async function handler(
	app: App,
	result: { pastOption: number; attached: TFile[] },
	files: (TFile | TFolder)[],
	selectedPath: string,
	move: boolean
): Promise<void> {
	const allFiles = [...new Set([...files, ...result.attached])];
	for (const file of allFiles) {
		await moveItem(app, file, selectedPath, result.pastOption, move);
	}
	new Notice(`File(s) ${move ? 'moved' : 'copied'} to ${selectedPath}`, 4000);
}

async function moveItem(
	app: App,
	file: TFile | TFolder,
	selectedPath: string,
	pastOption: number,
	move: boolean
): Promise<void> {
	const { filePath, fileName, destinationPath } = getDestinationPath(file, selectedPath);
	await makeCopy(app, file, fileName, selectedPath, filePath, destinationPath, pastOption, move);
}

function getDestinationPath(file: TFile | TFolder, selectedPath: string) {
	const filePath = this.app.vault.adapter.getFullPath(file.path);
	const fileName = path.basename(filePath);
	const destinationPath = path.join(selectedPath, fileName);
	return { filePath, fileName, destinationPath };
}

async function makeCopy(
	app: App,
	file: TFile | TFolder,
	fileName: string,
	selectedPath: string,
	normalizedFullPath: string,
	destinationPath: string,
	choice: number,
	move: boolean
): Promise<FileOperationResult> {
	try {
		if (choice === 2) {
			destinationPath = await getIncrementedFilePath(selectedPath, fileName);
		}
		await fs.copy(normalizedFullPath, destinationPath);
		if (move) {
			await app.vault.trash(file, true);
		}
		console.debug("File was successfully copied as", destinationPath);
		return { success: true };
	} catch (error) {
		console.error(`Error during file operation: ${error}`);
		return { success: false, error: String(error) };
	}
}

async function getIncrementedFilePath(selectedPath: string, fileName: string): Promise<string> {
	const { name: baseFileName, ext: extension } = path.parse(fileName);
	const regex = /^(.*) \((\d+)\)$/;
	const match = baseFileName.match(regex);

	let versionedFileName: string;
	let version = 1;

	if (match) {
		versionedFileName = `${match[1]} (${parseInt(match[2]) + 1})${extension}`;
	} else {
		versionedFileName = `${baseFileName} (${version})${extension}`;
		while (await fs.pathExists(path.join(selectedPath, versionedFileName))) {
			version++;
			versionedFileName = `${baseFileName} (${version})${extension}`;
		}
	}

	return path.join(selectedPath, versionedFileName);
}
