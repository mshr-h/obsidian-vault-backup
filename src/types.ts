import { Platform } from "obsidian";

export interface BackupSettings {
	backupFolderPathWindows: string;
	backupFolderPathUnix: string;
	filenameTemplate: string;
	compressionLevel: number;
	runOnStartup: boolean;
	startupDelayMs: number;
	runOnShutdown: boolean;
	excludedPaths: string[];
	retentionKeepLastN: number;
	retentionKeepDays: number;
	retentionMode: "keepLastN" | "keepDays" | "and" | "or";
}

export interface BackupProfile {
	id: string;
	name: string;
	settings: BackupSettings;
}

export interface VaultBackupSettings {
	schemaVersion: 2;
	profiles: BackupProfile[];
	activeProfileByDeviceName: Record<string, string>;
}

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

export interface BackupInfo {
	filename: string;
	path: string;
	size: number;
	created: number;
}
