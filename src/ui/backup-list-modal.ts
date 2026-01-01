import { Modal, App } from "obsidian";
import { listBackupFiles } from "../retention";

export class BackupListModal extends Modal {
	private backupFolderPath: string;
	private template: string;

	constructor(app: App, backupFolderPath: string, template: string) {
		super(app);
		this.backupFolderPath = backupFolderPath;
		this.template = template;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "Backup files" });

		const backups = listBackupFiles(this.backupFolderPath, this.template);

		if (backups.length === 0) {
			contentEl.createEl("p", { text: "No backup files found." });
			return;
		}

		const table = contentEl.createEl("table", {
			cls: "backup-list-table",
		});

		// Header
		const thead = table.createEl("thead");
		const headerRow = thead.createEl("tr");
		headerRow.createEl("th", { text: "Filename" });
		headerRow.createEl("th", { text: "Size" });
		headerRow.createEl("th", { text: "Created" });

		// Body
		const tbody = table.createEl("tbody");

		for (const backup of backups) {
			const row = tbody.createEl("tr");

			// Filename
			row.createEl("td", { text: backup.filename });

			// Size (formatted)
			const sizeInMB = (backup.size / (1024 * 1024)).toFixed(2);
			row.createEl("td", { text: `${sizeInMB} MB` });

			// Created (formatted date)
			const date = new Date(backup.created);
			row.createEl("td", { text: date.toLocaleString() });
		}

		contentEl.empty();
	}
}
