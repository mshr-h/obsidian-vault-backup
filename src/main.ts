import { Platform, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, BackupSettingTab } from "./settings";
import type { BackupSettings } from "./types";
import { getBackupFolderPath } from "./types";
import { BackupManager } from "./backup";
import { BackupListModal } from "./ui/backup-list-modal";

export default class VaultBackupPlugin extends Plugin {
	settings: BackupSettings;
	backupManager: BackupManager;

	async onload() {
		await this.loadSettings();

		this.backupManager = new BackupManager();

		// Add ribbon icon for quick backup
		this.addRibbonIcon("archive", "Create vault backup", () => {
			void this.executeBackup();
		});

		// Command: Create backup now
		this.addCommand({
			id: "create-backup",
			name: "Create backup now",
			callback: async () => {
				await this.executeBackup();
			},
		});

		// Command: Show backup list
		this.addCommand({
			id: "show-backup-list",
			name: "Show backup list",
			callback: () => {
				new BackupListModal(
					this.app,
					getBackupFolderPath(this.settings),
					this.settings.filenameTemplate
				).open();
			},
		});

		// Add settings tab
		this.addSettingTab(new BackupSettingTab(this.app, this));

		// Startup backup (with delay)
		if (this.settings.runOnStartup) {
			this.registerInterval(
				window.setTimeout(() => {
					console.error("Running startup backup...");
					void this.executeBackup();
				}, this.settings.startupDelayMs)
			);
		}
	}

	onunload() {
		// Shutdown backup (best-effort)
		if (this.settings.runOnShutdown && !this.backupManager.isBackupRunning()) {
			console.error("Running shutdown backup...");
			void this.executeBackup();
		}
	}

	async loadSettings() {
		const loadedData = (await this.loadData()) as Partial<BackupSettings & { backupFolderPath?: string }> | undefined;
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			loadedData
		);

		// Migration: if old backupFolderPath exists and new OS-specific fields are empty,
		// copy the old path to the appropriate OS-specific field
		if (
			loadedData?.backupFolderPath &&
			!loadedData.backupFolderPathWindows &&
			!loadedData.backupFolderPathUnix
		) {
			if (Platform.isWin) {
				this.settings.backupFolderPathWindows = loadedData.backupFolderPath;
			} else {
				this.settings.backupFolderPathUnix = loadedData.backupFolderPath;
			}
			await this.saveSettings();
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Execute a backup
	 */
	private async executeBackup(): Promise<void> {
		const adapter = this.app.vault.adapter as {
			basePath?: string;
		};
		const vaultPath = adapter.basePath ?? "";
		const vaultName = this.app.vault.getName();

		await this.backupManager.executeBackup(
			vaultPath,
			vaultName,
			this.settings
		);
	}

}

