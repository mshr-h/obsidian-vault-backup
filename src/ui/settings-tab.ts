import { App, Platform, PluginSettingTab, Setting } from "obsidian";
import type VaultBackupPlugin from "../main";
import type { BackupSettings } from "../types";
import { normalizeExcludedPaths } from "../exclusions";
import { renderProfileSettings } from "./profile-settings";

export class BackupSettingTab extends PluginSettingTab {
	plugin: VaultBackupPlugin;

	constructor(app: App, plugin: VaultBackupPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		this.render();
	}

	private render(): void {
		const { containerEl } = this;
		containerEl.empty();
		const activeProfile = this.plugin.profiles.getActiveProfile();
		const settings = activeProfile.settings;

		renderProfileSettings(containerEl, this.plugin.profiles, () => this.render());

		new Setting(containerEl)
			.setName("Backup")
			.setHeading();

		// Backup folder path (Windows)
		new Setting(containerEl)
			.setName(`Backup folder path (Windows)${Platform.isWin ? " (current)" : ""}`)
			.setDesc("Local folder where backup zip files will be saved on Windows")
			.addText((text) =>
				text
					.setPlaceholder("C:\\users\\username\\backups")
					.setValue(settings.backupFolderPathWindows)
					.onChange(async (value) => {
						settings.backupFolderPathWindows = value;
						await this.plugin.profiles.save();
					})
			);

		// Backup folder path (Unix)
		new Setting(containerEl)
			.setName(`Backup folder path (Unix)${!Platform.isWin ? " (current)" : ""}`)
			.setDesc("Local folder where backup zip files will be saved on macOS/Linux")
			.addText((text) =>
				text
					.setPlaceholder("/home/username/backups")
					.setValue(settings.backupFolderPathUnix)
					.onChange(async (value) => {
						settings.backupFolderPathUnix = value;
						await this.plugin.profiles.save();
					})
			);

		// Filename template
		new Setting(containerEl)
			.setName("Filename template")
			.setDesc(
				"Template for backup filenames. Variables: {{vault}}, {{date}}, {{time}}, {{datetime}}, {{date:FORMAT}}, {{time:FORMAT}}, {{datetime:FORMAT}}"
			)
			.addText((text) =>
				text
					.setPlaceholder("{{vault}}_{{datetime:YYYY-MM-DD_HHmmss}}")
					.setValue(settings.filenameTemplate)
					.onChange(async (value) => {
						settings.filenameTemplate = value;
						await this.plugin.profiles.save();
					})
			);

		// Compression level
		new Setting(containerEl)
			.setName("Compression level")
			.setDesc("Zip compression level (0 = no compression, 9 = maximum)")
			.addSlider((slider) =>
				slider
					.setLimits(0, 9, 1)
					.setValue(settings.compressionLevel)
					.setDynamicTooltip()
					.onChange(async (value) => {
						settings.compressionLevel = value;
						await this.plugin.profiles.save();
					})
			);

		new Setting(containerEl)
			.setName("Excluded paths")
			.setDesc("Vault-relative files or folders to skip, one path per line")
			.addTextArea((text) => {
				text.inputEl.rows = 5;
				text
					.setPlaceholder("attachments\nprivate.md\ndaily-notes/archive")
					.setValue(settings.excludedPaths.join("\n"))
					.onChange(async (value) => {
						settings.excludedPaths = normalizeExcludedPaths(
							value.split(/\r?\n/)
						);
						await this.plugin.profiles.save();
					});
			});

		// Startup backup
		new Setting(containerEl)
			.setName("Automatic backup")
			.setHeading();

		new Setting(containerEl)
			.setName("Run on startup")
			.setDesc("Automatically create a backup when Obsidian starts")
			.addToggle((toggle) =>
				toggle
					.setValue(settings.runOnStartup)
					.onChange(async (value) => {
						settings.runOnStartup = value;
						await this.plugin.profiles.save();
					})
			);

		new Setting(containerEl)
			.setName("Startup delay (ms)")
			.setDesc("Delay before running startup backup (in milliseconds)")
			.addText((text) =>
				text
					.setPlaceholder("5000")
					.setValue(String(settings.startupDelayMs))
					.onChange(async (value) => {
						const num = parseInt(value, 10);
						if (!isNaN(num) && num >= 0) {
							settings.startupDelayMs = num;
							await this.plugin.profiles.save();
						}
					})
			);

		new Setting(containerEl)
			.setName("Run on shutdown")
			.setDesc(
				"Attempt to create a backup when Obsidian closes (best-effort, not guaranteed)"
			)
			.addToggle((toggle) =>
				toggle
					.setValue(settings.runOnShutdown)
					.onChange(async (value) => {
						settings.runOnShutdown = value;
						await this.plugin.profiles.save();
					})
			);

		// Retention policy
		new Setting(containerEl)
			.setName("Retention policy")
			.setHeading();

		new Setting(containerEl)
			.setName("Retention mode")
			.setDesc("How to apply retention rules")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("keepLastN", "Keep last n backups only")
					.addOption("keepDays", "Keep backups within days only")
					.addOption("and", "Keep if both conditions met (and)")
					.addOption("or", "Keep if either condition met (or)")
					.setValue(settings.retentionMode)
					.onChange(async (value) => {
						settings.retentionMode = value as BackupSettings["retentionMode"];
						await this.plugin.profiles.save();
					})
			);

		new Setting(containerEl)
			.setName("Keep last n backups")
			.setDesc("Number of recent backups to keep (0 = unlimited)")
			.addText((text) =>
				text
					.setPlaceholder("10")
					.setValue(String(settings.retentionKeepLastN))
					.onChange(async (value) => {
						const num = parseInt(value, 10);
						if (!isNaN(num) && num >= 0) {
							settings.retentionKeepLastN = num;
							await this.plugin.profiles.save();
						}
					})
			);

		new Setting(containerEl)
			.setName("Keep backups within days")
			.setDesc("Keep backups created within this many days (0 = unlimited)")
			.addText((text) =>
				text
					.setPlaceholder("30")
					.setValue(String(settings.retentionKeepDays))
					.onChange(async (value) => {
						const num = parseInt(value, 10);
						if (!isNaN(num) && num >= 0) {
							settings.retentionKeepDays = num;
							await this.plugin.profiles.save();
						}
					})
			);
	}
}
