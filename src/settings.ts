import { App, PluginSettingTab, Setting } from "obsidian";
import type VaultBackupPlugin from "./main";
import type { BackupSettings } from "./types";

export const DEFAULT_SETTINGS: BackupSettings = {
	backupFolderPath: "",
	filenameTemplate: "{{vault}}_{{datetime:YYYY-MM-DD_HHmmss}}",
	compressionLevel: 6,
	runOnStartup: false,
	startupDelayMs: 5000,
	runOnShutdown: false,
	retentionKeepLastN: 10,
	retentionKeepDays: 30,
	retentionMode: "or",
};

export class BackupSettingTab extends PluginSettingTab {
	plugin: VaultBackupPlugin;

	constructor(app: App, plugin: VaultBackupPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Backup")
			.setHeading();

		// Backup folder path
		new Setting(containerEl)
			.setName("Backup folder path")
			.setDesc("Local folder where backup zip files will be saved")
			.addText((text) =>
				text
					.setPlaceholder("/path/to/backup/folder")
					.setValue(this.plugin.settings.backupFolderPath)
					.onChange(async (value) => {
						this.plugin.settings.backupFolderPath = value;
						await this.plugin.saveSettings();
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
					.setValue(this.plugin.settings.filenameTemplate)
					.onChange(async (value) => {
						this.plugin.settings.filenameTemplate = value;
						await this.plugin.saveSettings();
					})
			);

		// Compression level
		new Setting(containerEl)
			.setName("Compression level")
			.setDesc("Zip compression level (0 = no compression, 9 = maximum)")
			.addSlider((slider) =>
				slider
					.setLimits(0, 9, 1)
					.setValue(this.plugin.settings.compressionLevel)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.compressionLevel = value;
						await this.plugin.saveSettings();
					})
			);

		// Startup backup
		new Setting(containerEl)
			.setName("Automatic backup")
			.setHeading();

		new Setting(containerEl)
			.setName("Run on startup")
			.setDesc("Automatically create a backup when Obsidian starts")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.runOnStartup)
					.onChange(async (value) => {
						this.plugin.settings.runOnStartup = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Startup delay (ms)")
			.setDesc("Delay before running startup backup (in milliseconds)")
			.addText((text) =>
				text
					.setPlaceholder("5000")
					.setValue(String(this.plugin.settings.startupDelayMs))
					.onChange(async (value) => {
						const num = parseInt(value, 10);
						if (!isNaN(num) && num >= 0) {
							this.plugin.settings.startupDelayMs = num;
							await this.plugin.saveSettings();
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
					.setValue(this.plugin.settings.runOnShutdown)
					.onChange(async (value) => {
						this.plugin.settings.runOnShutdown = value;
						await this.plugin.saveSettings();
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
					.setValue(this.plugin.settings.retentionMode)
					.onChange(async (value: "keepLastN" | "keepDays" | "and" | "or") => {
						this.plugin.settings.retentionMode = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Keep last n backups")
			.setDesc("Number of recent backups to keep (0 = unlimited)")
			.addText((text) =>
				text
					.setPlaceholder("10")
					.setValue(String(this.plugin.settings.retentionKeepLastN))
					.onChange(async (value) => {
						const num = parseInt(value, 10);
						if (!isNaN(num) && num >= 0) {
							this.plugin.settings.retentionKeepLastN = num;
							await this.plugin.saveSettings();
						}
					})
			);

		new Setting(containerEl)
			.setName("Keep backups within days")
			.setDesc("Keep backups created within this many days (0 = unlimited)")
			.addText((text) =>
				text
					.setPlaceholder("30")
					.setValue(String(this.plugin.settings.retentionKeepDays))
					.onChange(async (value) => {
						const num = parseInt(value, 10);
						if (!isNaN(num) && num >= 0) {
							this.plugin.settings.retentionKeepDays = num;
							await this.plugin.saveSettings();
						}
					})
			);
	}
}
