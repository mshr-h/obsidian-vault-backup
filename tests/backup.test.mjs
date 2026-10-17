import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { moment } from "obsidian";
import { BackupManager } from "../src/backup.ts";
import { applyRetentionPolicy } from "../src/retention.ts";
import { parseTemplate, templateToRegex } from "../src/template.ts";
import { DEFAULT_SETTINGS } from "../src/settings.ts";
import { readZip } from "./support/zip.mjs";

test("filename formatting keeps local time and matches the retention pattern", (t) => {
	t.mock.method(moment, "now", () => new Date(2026, 9, 17, 13, 45, 12).getTime());
	for (const [template, expected] of [
		["{{vault}}_{{datetime}}", "My_Vault_2026-10-17_134512"],
		["{{date:YYYY.MM.DD}}_{{time:HH-mm}}", "2026.10.17_13-45"],
		["{{date}}_{{time}}", "2026-10-17_134512"],
		["backup[1]_{{datetime:YYYY-MM-DD}}", "backup[1]_2026-10-17"],
	]) {
		assert.equal(parseTemplate(template, "My/Vault"), expected);
		assert.equal(templateToRegex(template).test(`${expected}.zip`), true);
		assert.equal(templateToRegex(template).test(`${expected}.tmp.123`), false);
	}
});

test("backup manager prevents concurrent backups and releases its lock after failure", async (t) => {
	const root = await fs.mkdtemp(join(tmpdir(), "vault-backup-manager-"));
	t.after(() => fs.rm(root, { recursive: true, force: true }));
	const vault = join(root, "vault");
	const destination = join(root, "backups");
	await fs.mkdir(vault);
	await fs.writeFile(join(vault, "note.md"), "content");
	const settings = { ...DEFAULT_SETTINGS, backupFolderPathUnix: destination, backupFolderPathWindows: destination };
	const manager = new BackupManager();
	const pending = manager.executeBackup(vault, "vault", settings);
	assert.equal(manager.isBackupRunning(), true);
	assert.equal(await manager.executeBackup(vault, "vault", settings), null);
	const output = await pending;
	assert.equal(manager.isBackupRunning(), false);
	assert.equal((await readZip(output)).get("note.md").toString(), "content");
	t.mock.method(console, "error", () => {});
	assert.equal(await manager.executeBackup(join(root, "missing"), "vault", settings), null);
	assert.equal(manager.isBackupRunning(), false);
	assert.notEqual(await manager.executeBackup(vault, "vault", settings), null);
});

for (const [mode, keepLastN, keepDays, expected] of [
	["keepLastN", 2, 0, [0, 1]],
	["keepDays", 0, 5, [0, 1]],
	["and", 1, 5, [0]],
	["or", 1, 5, [0, 1]],
	["keepLastN", 0, 0, [0, 1, 2]],
	["keepDays", 0, 0, [0, 1, 2]],
	["and", 0, 0, [0, 1, 2]],
	["or", 0, 0, [0, 1, 2]],
]) {
	test(`retention ${mode} with count ${keepLastN} and days ${keepDays}`, async (t) => {
		const directory = await fs.mkdtemp(join(tmpdir(), "vault-backup-retention-"));
		t.after(() => fs.rm(directory, { recursive: true, force: true }));
		const ages = [1, 3, 10];
		for (const [index, age] of ages.entries()) {
			const filename = join(directory, `backup_${index}.zip`);
			await fs.writeFile(filename, "backup");
			const created = new Date(Date.now() - age * 24 * 60 * 60 * 1000);
			await fs.utimes(filename, created, created);
		}
		await fs.writeFile(join(directory, "other.zip"), "unrelated");
		const settings = { ...DEFAULT_SETTINGS, retentionMode: mode, retentionKeepLastN: keepLastN, retentionKeepDays: keepDays };
		assert.equal(applyRetentionPolicy(directory, "backup_{{datetime}}", settings), 3 - expected.length);
		assert.deepEqual((await fs.readdir(directory)).sort(), [...expected.map((i) => `backup_${i}.zip`), "other.zip"]);
	});
}
