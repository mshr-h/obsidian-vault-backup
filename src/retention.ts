import * as fs from "fs";
import * as path from "path";
import type { BackupInfo, BackupSettings } from "./types";
import { templateToRegex } from "./template";

/**
 * List all backup files matching the template pattern
 */
export function listBackupFiles(
	backupFolderPath: string,
	template: string
): BackupInfo[] {
	if (!fs.existsSync(backupFolderPath)) {
		return [];
	}

	const pattern = templateToRegex(template);
	const files: BackupInfo[] = [];

	try {
		const entries = fs.readdirSync(backupFolderPath);

		for (const filename of entries) {
			// Only include files that match our template pattern
			if (pattern.test(filename)) {
				const fullPath = path.join(backupFolderPath, filename);
				const stats = fs.statSync(fullPath);

				if (stats.isFile()) {
					files.push({
						filename,
						path: fullPath,
						size: stats.size,
						created: stats.mtimeMs,
					});
				}
			}
		}

		// Sort by creation time (newest first)
		files.sort((a, b) => b.created - a.created);
	} catch (error) {
		console.error("Error listing backup files:", error);
	}

	return files;
}

/**
 * Determine which backups to keep based on retention settings
 */
function getBackupsToKeep(
	backups: BackupInfo[],
	settings: BackupSettings
): Set<string> {
	const toKeep = new Set<string>();
	const now = Date.now();

	// Sort backups by creation time (newest first)
	const sorted = [...backups].sort((a, b) => b.created - a.created);

	switch (settings.retentionMode) {
		case "keepLastN": {
			// Keep only the last N backups
			if (settings.retentionKeepLastN > 0) {
				sorted
					.slice(0, settings.retentionKeepLastN)
					.forEach((b) => toKeep.add(b.path));
			} else {
				// 0 means unlimited
				sorted.forEach((b) => toKeep.add(b.path));
			}
			break;
		}

		case "keepDays": {
			// Keep only backups within the specified number of days
			if (settings.retentionKeepDays > 0) {
				const cutoffTime = now - settings.retentionKeepDays * 24 * 60 * 60 * 1000;
				sorted
					.filter((b) => b.created >= cutoffTime)
					.forEach((b) => toKeep.add(b.path));
			} else {
				// 0 means unlimited
				sorted.forEach((b) => toKeep.add(b.path));
			}
			break;
		}

		case "and": {
			// Keep if BOTH conditions are met
			const lastN =
				settings.retentionKeepLastN > 0
					? sorted.slice(0, settings.retentionKeepLastN)
					: sorted;

			const cutoffTime =
				settings.retentionKeepDays > 0
					? now - settings.retentionKeepDays * 24 * 60 * 60 * 1000
					: 0;

			lastN
				.filter(
					(b) => settings.retentionKeepDays === 0 || b.created >= cutoffTime
				)
				.forEach((b) => toKeep.add(b.path));
			break;
		}

		case "or": {
			// Keep if EITHER condition is met
			if (settings.retentionKeepLastN > 0) {
				sorted
					.slice(0, settings.retentionKeepLastN)
					.forEach((b) => toKeep.add(b.path));
			}

			if (settings.retentionKeepDays > 0) {
				const cutoffTime = now - settings.retentionKeepDays * 24 * 60 * 60 * 1000;
				sorted
					.filter((b) => b.created >= cutoffTime)
					.forEach((b) => toKeep.add(b.path));
			}

			// If both are 0 (unlimited), keep all
			if (
				settings.retentionKeepLastN === 0 &&
				settings.retentionKeepDays === 0
			) {
				sorted.forEach((b) => toKeep.add(b.path));
			}
			break;
		}
	}

	return toKeep;
}

/**
 * Apply retention policy: delete old backups according to settings
 */
export function applyRetentionPolicy(
	backupFolderPath: string,
	template: string,
	settings: BackupSettings
): number {
	const backups = listBackupFiles(backupFolderPath, template);
	const toKeep = getBackupsToKeep(backups, settings);

	let deletedCount = 0;

	for (const backup of backups) {
		if (!toKeep.has(backup.path)) {
			try {
				fs.unlinkSync(backup.path);
				deletedCount++;
			} catch (error) {
				console.error(`Failed to delete backup ${backup.filename}:`, error);
			}
		}
	}

	return deletedCount;
}
