import { Modal, App } from "obsidian";
import type { BackupInfo } from "../types";
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

		contentEl.createEl("h2", { text: "Backup Files" });

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

		// Add some styling
		contentEl.createEl("style", {
			text: `
				.backup-list-table {
					width: 100%;
					border-collapse: collapse;
					margin-top: 1em;
				}
				.backup-list-table th,
				.backup-list-table td {
					padding: 0.5em;
					text-align: left;
					border-bottom: 1px solid var(--background-modifier-border);
				}
				.backup-list-table th {
					font-weight: bold;
					background-color: var(--background-secondary);
				}
				.backup-list-table tr:hover {
					background-color: var(--background-modifier-hover);
				}
			`,
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
