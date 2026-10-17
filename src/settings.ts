import type { BackupSettings } from "./types";

export const DEFAULT_SETTINGS: BackupSettings = {
	backupFolderPathWindows: "",
	backupFolderPathUnix: "",
	filenameTemplate: "{{vault}}_{{datetime:YYYY-MM-DD_HHmmss}}",
	compressionLevel: 6,
	runOnStartup: false,
	startupDelayMs: 5000,
	runOnShutdown: false,
	excludedPaths: [],
	retentionKeepLastN: 10,
	retentionKeepDays: 30,
	retentionMode: "or",
};
