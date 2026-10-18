import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

test("version bump records a release even when its minimum app version is unchanged", async (t) => {
	const directory = await fs.mkdtemp(join(tmpdir(), "vault-backup-version-"));
	t.after(() => fs.rm(directory, { recursive: true, force: true }));
	await fs.writeFile(join(directory, "manifest.json"), JSON.stringify({ version: "0.3.0", minAppVersion: "1.4.5" }));
	await fs.writeFile(join(directory, "versions.json"), JSON.stringify({ "0.3.0": "1.4.5" }));
	await promisify(execFile)(process.execPath, [resolve("version-bump.mjs")], {
		cwd: directory,
		env: { ...process.env, npm_package_version: "0.3.1" },
	});
	assert.equal(JSON.parse(await fs.readFile(join(directory, "manifest.json"), "utf8")).version, "0.3.1");
	assert.deepEqual(JSON.parse(await fs.readFile(join(directory, "versions.json"), "utf8")), {
		"0.3.0": "1.4.5",
		"0.3.1": "1.4.5",
	});
});
