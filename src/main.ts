import { FileSystemAdapter, Notice, Platform, Plugin } from "obsidian";
import { hostname } from "node:os";
import { BackupManager } from "./backup";
import { registerCommands } from "./commands";
import { ProfileManager } from "./profile-manager";
import type { LoadedSettingsData } from "./profiles";
import { BackupSettingTab } from "./ui/settings-tab";

export default class VaultBackupPlugin extends Plugin {
	profiles!: ProfileManager;
	private readonly backupManager = new BackupManager();

	async onload() {
		this.profiles = new ProfileManager(
			(await this.loadData()) as LoadedSettingsData | undefined,
			hostname(),
			(data) => this.saveData(data),
			Platform.isWin
		);
		await this.profiles.save();

		registerCommands(this);
		this.addSettingTab(new BackupSettingTab(this.app, this));

		const settings = this.profiles.getActiveSettings();
		if (settings.runOnStartup) {
			const timeout = window.setTimeout(() => {
				void this.executeBackup();
			}, settings.startupDelayMs);
			this.register(() => window.clearTimeout(timeout));
		}
	}

	onunload() {
		if (this.profiles?.getActiveSettings().runOnShutdown) {
			if (!this.backupManager.isBackupRunning()) {
				void this.executeBackup();
			}
		}
	}

	async executeBackup(): Promise<void> {
		const { adapter } = this.app.vault;
		if (!(adapter instanceof FileSystemAdapter)) {
			new Notice("Backups require a local desktop vault");
			return;
		}

		await this.backupManager.executeBackup(
			adapter.getBasePath(),
			this.app.vault.getName(),
			this.profiles.getActiveSettings()
		);
	}
}
