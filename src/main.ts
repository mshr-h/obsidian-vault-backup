import { Plugin } from "obsidian";
import { hostname } from "os";
import { BackupSettingTab } from "./settings";
import type { BackupProfile, BackupSettings, VaultBackupSettings } from "./types";
import { getBackupFolderPath } from "./types";
import { BackupManager } from "./backup";
import { BackupListModal } from "./ui/backup-list-modal";
import {
	createProfile,
	duplicateProfile,
	type LoadedSettingsData,
	normalizeLoadedData,
} from "./profiles";

export default class VaultBackupPlugin extends Plugin {
	data: VaultBackupSettings;
	settings: BackupSettings;
	backupManager: BackupManager;
	deviceName: string;

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
				const settings = this.getActiveSettings();
				new BackupListModal(
					this.app,
					getBackupFolderPath(settings),
					settings.filenameTemplate
				).open();
			},
		});

		// Add settings tab
		this.addSettingTab(new BackupSettingTab(this.app, this));

		// Startup backup (with delay)
		if (this.getActiveSettings().runOnStartup) {
			this.registerInterval(
				window.setTimeout(() => {
					console.error("Running startup backup...");
					void this.executeBackup();
				}, this.getActiveSettings().startupDelayMs)
			);
		}
	}

	onunload() {
		// Shutdown backup (best-effort)
		if (
			this.getActiveSettings().runOnShutdown &&
			!this.backupManager.isBackupRunning()
		) {
			console.error("Running shutdown backup...");
			void this.executeBackup();
		}
	}

	async loadSettings() {
		this.deviceName = hostname();
		const loadedData = (await this.loadData()) as LoadedSettingsData | undefined;

		this.data = normalizeLoadedData(loadedData, this.deviceName);
		this.settings = this.getActiveSettings();
		await this.saveSettings();
	}

	async saveSettings() {
		await this.saveData(this.data);
	}

	getActiveProfile(): BackupProfile {
		const activeProfileId = this.data.activeProfileByDeviceName[this.deviceName];
		const activeProfile =
			this.data.profiles.find((profile) => profile.id === activeProfileId) ??
			this.data.profiles[0]!;

		if (this.data.activeProfileByDeviceName[this.deviceName] !== activeProfile.id) {
			this.data.activeProfileByDeviceName[this.deviceName] = activeProfile.id;
		}

		this.settings = activeProfile.settings;
		return activeProfile;
	}

	getActiveSettings(): BackupSettings {
		return this.getActiveProfile().settings;
	}

	async setActiveProfileForCurrentDevice(profileId: string): Promise<void> {
		if (!this.data.profiles.some((profile) => profile.id === profileId)) {
			return;
		}

		this.data.activeProfileByDeviceName[this.deviceName] = profileId;
		this.settings = this.getActiveSettings();
		await this.saveSettings();
	}

	async createProfile(name = "New profile"): Promise<BackupProfile> {
		const profile = createProfile(this.data.profiles, name);
		this.data.profiles.push(profile);
		await this.setActiveProfileForCurrentDevice(profile.id);
		return profile;
	}

	async duplicateActiveProfile(): Promise<BackupProfile> {
		const activeProfile = this.getActiveProfile();
		const profile = duplicateProfile(this.data.profiles, activeProfile);
		this.data.profiles.push(profile);
		await this.setActiveProfileForCurrentDevice(profile.id);
		return profile;
	}

	async renameProfile(profileId: string, name: string): Promise<void> {
		const profile = this.data.profiles.find((item) => item.id === profileId);
		const trimmedName = name.trim();

		if (!profile || !trimmedName) {
			return;
		}

		profile.name = trimmedName;
		await this.saveSettings();
	}

	async deleteProfile(profileId: string): Promise<boolean> {
		if (this.data.profiles.length <= 1) {
			return false;
		}

		const profileIndex = this.data.profiles.findIndex(
			(profile) => profile.id === profileId
		);

		if (profileIndex === -1) {
			return false;
		}

		this.data.profiles.splice(profileIndex, 1);
		const fallbackProfile = this.data.profiles[0]!;

		for (const deviceName in this.data.activeProfileByDeviceName) {
			const activeProfileId = this.data.activeProfileByDeviceName[deviceName];
			if (activeProfileId === profileId) {
				this.data.activeProfileByDeviceName[deviceName] = fallbackProfile.id;
			}
		}

		this.settings = this.getActiveSettings();
		await this.saveSettings();
		return true;
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
		const settings = this.getActiveSettings();

		await this.backupManager.executeBackup(
			vaultPath,
			vaultName,
			settings
		);
	}

}
