import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { ZipArchive } from "archiver";
import { createZipBackup } from "../src/zip.ts";
import { readZip } from "./support/zip.mjs";

async function fixture(t) {
	const root = await fs.mkdtemp(join(tmpdir(), "vault-backup-zip-"));
	t.after(() => fs.rm(root, { recursive: true, force: true }));
	const vault = join(root, "vault");
	const backups = join(root, "backups");
	await fs.mkdir(vault);
	await fs.writeFile(join(vault, "note.md"), "Vault contents 日本語");
	return { root, vault, backups };
}

for (const level of [0, 6, 9]) {
	test(`ZIP round trip preserves files and exclusions at compression ${level}`, async (t) => {
		const { vault, backups } = await fixture(t);
		await fs.mkdir(join(vault, ".obsidian"));
		await fs.writeFile(join(vault, ".obsidian", "app.json"), "{}");
		await fs.mkdir(join(vault, "attachments"));
		await fs.writeFile(join(vault, "attachments", "secret.bin"), "excluded");
		const binary = Buffer.from([0, 1, 128, 255]);
		await fs.writeFile(join(vault, "binary.dat"), binary);
		const output = await createZipBackup(vault, join(backups, "test"), level, ["\\attachments\\"]);
		const contents = await readZip(output);
		assert.deepEqual([...contents.keys()].sort(), [".obsidian/app.json", "binary.dat", "note.md"]);
		assert.equal(contents.get("note.md").toString(), "Vault contents 日本語");
		assert.deepEqual(contents.get("binary.dat"), binary);
		assert.deepEqual(await fs.readdir(backups), ["test.zip"]);
	});
}

test("does not include an output directory inside the vault", async (t) => {
	const { vault } = await fixture(t);
	const backups = join(vault, "backups");
	await fs.mkdir(backups);
	await fs.writeFile(join(backups, "old.zip"), "previous backup");
	const output = await createZipBackup(vault, join(backups, "test"), 6);
	assert.deepEqual([... (await readZip(output)).keys()], ["note.md"]);
});

test("does not archive its temporary or final file when saving at the vault root", async (t) => {
	const { vault } = await fixture(t);
	const outputPath = join(vault, "test");
	await fs.writeFile(`${outputPath}.zip`, "previous backup");
	const output = await createZipBackup(vault, outputPath, 6);
	assert.deepEqual([... (await readZip(output)).keys()], ["note.md"]);
});

test("cleans temporary files if finalization rejects and preserves the previous backup", async (t) => {
	const { vault, backups } = await fixture(t);
	await fs.mkdir(backups);
	await fs.writeFile(join(backups, "test.zip"), "previous backup");
	t.mock.method(ZipArchive.prototype, "finalize", async () => { throw new Error("finalization failed"); });
	await assert.rejects(createZipBackup(vault, join(backups, "test"), 6), /finalization failed/);
	assert.deepEqual(await fs.readdir(backups), ["test.zip"]);
	assert.equal(await fs.readFile(join(backups, "test.zip"), "utf8"), "previous backup");
});

test("rejects incomplete archives on a missing-file warning", async (t) => {
	const { vault, backups } = await fixture(t);
	t.mock.method(ZipArchive.prototype, "file", function () {
		queueMicrotask(() => this.emit("warning", Object.assign(new Error("missing input"), { code: "ENOENT" })));
		return this;
	});
	await assert.rejects(createZipBackup(vault, join(backups, "test"), 6), /missing input/);
	assert.deepEqual(await fs.readdir(backups), []);
});

test("cleans temporary files when the atomic rename fails", async (t) => {
	const { vault, backups } = await fixture(t);
	await fs.mkdir(join(backups, "test.zip"), { recursive: true });
	await assert.rejects(createZipBackup(vault, join(backups, "test"), 6));
	assert.deepEqual(await fs.readdir(backups), ["test.zip"]);
	assert.equal((await fs.stat(join(backups, "test.zip"))).isDirectory(), true);
});

test("rejects a missing vault before creating output directories", async (t) => {
	const { root, backups } = await fixture(t);
	await assert.rejects(createZipBackup(join(root, "missing"), join(backups, "test"), 6), { code: "ENOENT" });
	await assert.rejects(fs.stat(backups), { code: "ENOENT" });
});
