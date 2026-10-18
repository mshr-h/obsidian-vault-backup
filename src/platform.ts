import { Platform } from "obsidian";
import type { BackupSettings } from "./types";

/**
 * Get the backup folder path for the current OS
 * @param settings Backup settings
 * @returns The backup folder path for the current platform
 */
export function getBackupFolderPath(settings: BackupSettings): string {
	return Platform.isWin
		? settings.backupFolderPathWindows
		: settings.backupFolderPathUnix;
}

/**
 * Get the OS label for the current platform
 * @returns "Windows" or "Unix"
 */
export function getCurrentOsLabel(): string {
	return Platform.isWin ? "Windows" : "Unix";
}
