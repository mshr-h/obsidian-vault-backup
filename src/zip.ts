import { createWriteStream } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { ZipArchive } from "archiver";
import { isPathExcluded, normalizeExcludedPaths } from "./exclusions";

async function addFilesToArchive(
	archive: ZipArchive,
	dirPath: string,
	basePath: string,
	excludedPaths: string[]
): Promise<void> {
	const entries = await fs.readdir(dirPath, { withFileTypes: true });

	for (const entry of entries) {
		if (archive.destroyed) {
			return;
		}
		const fullPath = path.join(dirPath, entry.name);
		const relativePath = path.relative(basePath, fullPath).replace(/\\/g, "/");
		if (isPathExcluded(relativePath, excludedPaths)) {
			continue;
		}

		if (entry.isDirectory()) {
			await addFilesToArchive(archive, fullPath, basePath, excludedPaths);
		} else if (entry.isFile()) {
			// Open files lazily so large vaults do not exhaust file descriptors.
			archive.file(fullPath, { name: relativePath });
		}
	}
}

async function writeArchive(
	vaultPath: string,
	tempPath: string,
	compressionLevel: number,
	excludedPaths: string[]
): Promise<void> {
	const archive = new ZipArchive({ zlib: { level: compressionLevel } });
	const output = createWriteStream(tempPath, { flags: "wx" });
	const completion = pipeline(archive, output);
	archive.on("warning", (error) => {
		// A partial archive must not be reported as a successful backup.
		archive.destroy(error);
	});

	try {
		await Promise.all([
			completion,
			(async () => {
				await addFilesToArchive(archive, vaultPath, vaultPath, excludedPaths);
				await archive.finalize();
			})(),
		]);
	} catch (error) {
		archive.abort();
		archive.destroy();
		output.destroy();
		await completion.catch(() => undefined);
		throw error;
	}
}

/** Create a ZIP via a temporary file, publishing it only after a complete write. */
export async function createZipBackup(
	vaultPath: string,
	outputPath: string,
	compressionLevel: number,
	excludedPaths: string[] = []
): Promise<string> {
	const vaultStats = await fs.stat(vaultPath);
	if (!vaultStats.isDirectory()) {
		throw new Error(`Vault path is not a directory: ${vaultPath}`);
	}

	const finalPath = `${outputPath}.zip`;
	const tempPath = `${outputPath}.tmp.${randomUUID()}`;
	const outputDir = path.dirname(outputPath);
	const relativeOutputDir = path.relative(vaultPath, outputDir);
	const exclusions = [...excludedPaths];
	if (
		relativeOutputDir &&
		!path.isAbsolute(relativeOutputDir) &&
		!relativeOutputDir.split(path.sep).includes("..")
	) {
		// Do not recursively include previous backups when saving inside the vault.
		exclusions.push(relativeOutputDir);
	}
	exclusions.push(
		path.relative(vaultPath, tempPath),
		path.relative(vaultPath, finalPath)
	);

	await fs.mkdir(outputDir, { recursive: true });
	try {
		await writeArchive(
			vaultPath,
			tempPath,
			compressionLevel,
			normalizeExcludedPaths(exclusions)
		);
		await fs.rename(tempPath, finalPath);
		return finalPath;
	} catch (error) {
		try {
			await fs.rm(tempPath, { force: true });
		} catch (cleanupError) {
			console.error("Failed to clean up temp file:", cleanupError);
		}
		throw error;
	}
}
