import * as fs from "fs";
import * as path from "path";
import archiver from "archiver";

/**
 * Generate a random suffix for temporary files
 */
function generateRandomSuffix(): string {
	return Math.random().toString(36).substring(2, 15);
}

/**
 * Recursively add files to archive
 */
function addFilesToArchive(
	archive: archiver.Archiver,
	dirPath: string,
	basePath: string
): void {
	const entries = fs.readdirSync(dirPath, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name);
		const relativePath = path.relative(basePath, fullPath);

		try {
			if (entry.isDirectory()) {
				// Recursively add subdirectory
				addFilesToArchive(archive, fullPath, basePath);
			} else if (entry.isFile()) {
				// Add file to archive using stream
				const fileStream = fs.createReadStream(fullPath);
				archive.append(fileStream, { name: relativePath });
			}
		} catch (error) {
			console.error(`Failed to add ${relativePath}:`, error);
		}
	}
}

/**
 * Create a ZIP backup of the vault using atomic operations (temp file + rename)
 * @param vaultPath Absolute path to the vault root
 * @param outputPath Absolute path for the final ZIP file (without .zip extension)
 * @param compressionLevel ZIP compression level (0-9)
 * @returns Path to the created ZIP file
 */
export async function createZipBackup(
	vaultPath: string,
	outputPath: string,
	compressionLevel: number
): Promise<string> {
	const finalPath = `${outputPath}.zip`;
	const tempPath = `${outputPath}.tmp.${generateRandomSuffix()}`;

	// Validate vault path exists
	if (!fs.existsSync(vaultPath)) {
		throw new Error(`Vault path does not exist: ${vaultPath}`);
	}

	try {
		// Ensure output directory exists
		const outputDir = path.dirname(outputPath);
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		// Create write stream for temporary file
		const output = fs.createWriteStream(tempPath);
		const archive = archiver("zip", {
			zlib: { level: compressionLevel },
		});

		// Pipe archive to file
		archive.pipe(output);

		// Add all files from vault directory (including hidden files)
		addFilesToArchive(archive, vaultPath, vaultPath);

		// Finalize the archive and wait for both archive finalization and stream close
		await new Promise<void>((resolve, reject) => {
			output.on("close", () => {
				resolve();
			});
			output.on("error", (err) => {
				console.error("Output stream error:", err);
				reject(err);
			});
			archive.on("error", (err) => {
				console.error("Archive error:", err);
				reject(err);
			});
			archive.on("warning", (warn) => {
				if (warn.code === "ENOENT") {
					console.warn("Archive warning (file not found):", warn);
				} else {
					console.error("Archive warning:", warn);
					reject(warn);
				}
			});
			
			// This triggers the 'close' event on output stream when done
			void archive.finalize();
		});

		// Atomic rename: move temp file to final location
		fs.renameSync(tempPath, finalPath);

		return finalPath;
	} catch (error) {
		// Clean up temp file if it exists
		try {
			if (fs.existsSync(tempPath)) {
				fs.unlinkSync(tempPath);
			}
		} catch (cleanupError) {
			console.error("Failed to clean up temp file:", cleanupError);
		}

		throw error;
	}
}
