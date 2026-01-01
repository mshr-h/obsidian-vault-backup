import { Notice, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, BackupSettingTab } from "./settings";
import type { BackupSettings } from "./types";
import { BackupManager } from "./backup";
import { BackupListModal } from "./ui/backup-list-modal";
import * as path from "path";

export default class VaultBackupPlugin extends Plugin {
	settings: BackupSettings;
	backupManager: BackupManager;

	async onload() {
		await this.loadSettings();

		this.backupManager = new BackupManager();

		// Add ribbon icon for quick backup
		this.addRibbonIcon("archive", "Create vault backup", async () => {
			await this.executeBackup();
		});

		// Command: Create backup now
		this.addCommand({
			id: "create-backup",
			name: "Create backup now",
			callback: async () => {
				await this.executeBackup();
			},
		});

		// Command: Open backup folder
		this.addCommand({
			id: "open-backup-folder",
			name: "Open backup folder",
			callback: () => {
				this.openBackupFolder();
			},
		});

		// Command: Show backup list
		this.addCommand({
			id: "show-backup-list",
			name: "Show backup list",
			callback: () => {
				new BackupListModal(
					this.app,
					this.settings.backupFolderPath,
					this.settings.filenameTemplate
				).open();
			},
		});

		// Add settings tab
		this.addSettingTab(new BackupSettingTab(this.app, this));

		// Startup backup (with delay)
		if (this.settings.runOnStartup) {
			this.registerInterval(
				window.setTimeout(async () => {
					console.log("Running startup backup...");
					await this.executeBackup();
				}, this.settings.startupDelayMs)
			);
		}
	}

	async onunload() {
		// Shutdown backup (best-effort)
		if (this.settings.runOnShutdown && !this.backupManager.isBackupRunning()) {
			console.log("Running shutdown backup...");
			await this.executeBackup();
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Execute a backup
	 */
	private async executeBackup(): Promise<void> {
		const vaultPath = (this.app.vault.adapter as any).basePath;
		const vaultName = this.app.vault.getName();

		await this.backupManager.executeBackup(
			vaultPath,
			vaultName,
			this.settings
		);
	}

	/**
	 * Open the backup folder in the system file manager
	 */
	private openBackupFolder(): void {
		if (!this.settings.backupFolderPath) {
			new Notice("Backup folder path is not configured");
			return;
		}

		const { shell } = require("electron");
		shell.openPath(this.settings.backupFolderPath);
	}
}

