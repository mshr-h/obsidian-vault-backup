import { build } from "esbuild";
import { spawn } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const outputDir = await mkdtemp(join(tmpdir(), "vault-backup-tests-"));
try {
	const entryPoints = (await readdir("tests"))
		.filter((name) => name.endsWith(".test.mjs"))
		.map((name) => join("tests", name));
	await build({
		entryPoints,
		bundle: true,
		platform: "node",
		format: "cjs",
		target: "node18",
		outdir: outputDir,
		outExtension: { ".js": ".cjs" },
		alias: { obsidian: resolve("tests/support/obsidian.mjs") },
	});
	const testFiles = (await readdir(outputDir)).map((name) => join(outputDir, name));
	process.exitCode = await new Promise((resolve, reject) => {
		const child = spawn(process.execPath, ["--test", ...testFiles], { stdio: "inherit" });
		child.once("error", reject);
		child.once("exit", (code) => resolve(code ?? 1));
	});
} finally {
	await rm(outputDir, { recursive: true, force: true });
}
