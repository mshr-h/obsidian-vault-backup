import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

test("production bundle loads without installed runtime dependencies", async (t) => {
	const directory = await mkdtemp(join(tmpdir(), "vault-backup-bundle-"));
	t.after(() => rm(directory, { recursive: true, force: true }));
	await copyFile(resolve("main.js"), join(directory, "main.cjs"));

	// Obsidian supplies the host API. All other packages must be in main.js.
	const hostDirectory = join(directory, "node_modules", "obsidian");
	await mkdir(hostDirectory, { recursive: true });
	await writeFile(join(hostDirectory, "index.js"), `
		module.exports = {
			Plugin: class Plugin {},
			PluginSettingTab: class PluginSettingTab {},
			Modal: class Modal {},
		};
	`);

	await promisify(execFile)(process.execPath, [
		"--no-global-search-paths",
		"--input-type=commonjs",
		"--eval",
		`
			try {
				const assert = require("node:assert/strict");
				const { Plugin } = require("obsidian");
				const VaultBackupPlugin = require("./main.cjs").default;
				assert.equal(typeof VaultBackupPlugin, "function");
				assert.equal(Object.getPrototypeOf(VaultBackupPlugin), Plugin);
			} catch (error) {
				console.error(error.stack);
				process.exitCode = 1;
			}
		`,
	], {
		cwd: directory,
		env: { ...process.env, NODE_PATH: "", NODE_OPTIONS: "" },
	});
});
