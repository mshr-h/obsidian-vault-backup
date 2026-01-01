export interface BackupSettings {
	backupFolderPath: string;
	filenameTemplate: string;
	compressionLevel: number;
	runOnStartup: boolean;
	startupDelayMs: number;
	runOnShutdown: boolean;
	retentionKeepLastN: number;
	retentionKeepDays: number;
	retentionMode: "keepLastN" | "keepDays" | "and" | "or";
}

export interface BackupInfo {
	filename: string;
	path: string;
	size: number;
	created: number;
}
