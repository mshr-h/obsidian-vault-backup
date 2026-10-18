import type VaultBackupPlugin from "./main";
import { getBackupFolderPath } from "./platform";
import { BackupListModal } from "./ui/backup-list-modal";

export function registerCommands(plugin: VaultBackupPlugin): void {
	plugin.addRibbonIcon("archive", "Create vault backup", () => {
		void plugin.executeBackup();
	});

	plugin.addCommand({
		id: "create-backup",
		name: "Create backup now",
		callback: () => plugin.executeBackup(),
	});

	plugin.addCommand({
		id: "show-backup-list",
		name: "Show backup list",
		callback: () => {
			const settings = plugin.profiles.getActiveSettings();
			new BackupListModal(
				plugin.app,
				getBackupFolderPath(settings),
				settings.filenameTemplate
			).open();
		},
	});
}
