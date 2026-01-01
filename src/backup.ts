import { Notice } from "obsidian";
import * as path from "path";
import type { BackupSettings } from "./types";
import { parseTemplate } from "./template";
import { createZipBackup } from "./zip";
import { applyRetentionPolicy } from "./retention";

/**
 * Manages backup execution with concurrent execution prevention
 */
export class BackupManager {
	private isRunning = false;

	/**
	 * Execute a backup
	 * @param vaultPath Absolute path to the vault root
	 * @param vaultName Name of the vault
	 * @param settings Backup settings
	 * @returns Path to the created backup file, or null if backup was skipped
	 */
	async executeBackup(
		vaultPath: string,
		vaultName: string,
		settings: BackupSettings
	): Promise<string | null> {
		// Prevent concurrent execution
		if (this.isRunning) {
			new Notice("Backup is already in progress");
			return null;
		}

		// Validate backup folder path
		if (!settings.backupFolderPath) {
			new Notice("Backup folder path is not configured");
			return null;
		}

		this.isRunning = true;

		try {
			new Notice("Starting backup...");

			// Generate filename from template
			const filename = parseTemplate(settings.filenameTemplate, vaultName);
			const outputPath = path.join(settings.backupFolderPath, filename);

			// Create ZIP backup
			const backupPath = await createZipBackup(
				vaultPath,
				outputPath,
				settings.compressionLevel
			);

			new Notice(`Backup completed: ${path.basename(backupPath)}`);

			// Apply retention policy
			const deletedCount = applyRetentionPolicy(
				settings.backupFolderPath,
				settings.filenameTemplate,
				settings
			);

			if (deletedCount > 0) {
				console.error(`Deleted ${deletedCount} old backup(s)`);
			}

			return backupPath;
		} catch (error) {
			console.error("Backup failed:", error);
			const message = error instanceof Error ? error.message : String(error);
			new Notice(`Backup failed: ${message}`);
			return null;
		} finally {
			this.isRunning = false;
		}
	}

	/**
	 * Check if a backup is currently running
	 */
	isBackupRunning(): boolean {
		return this.isRunning;
	}
}
