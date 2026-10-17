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

export interface BackupInfo {
	filename: string;
	path: string;
	size: number;
	created: number;
}
