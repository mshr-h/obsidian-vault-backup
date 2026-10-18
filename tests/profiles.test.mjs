import assert from "node:assert/strict";
import { test } from "node:test";
import { ProfileManager } from "../src/profile-manager.ts";
import { normalizeLoadedData } from "../src/profiles.ts";
import { DEFAULT_SETTINGS } from "../src/settings.ts";

for (const isWindows of [true, false]) {
	test(`migrates legacy settings on ${isWindows ? "Windows" : "Unix"}`, () => {
		const data = normalizeLoadedData({ backupFolderPath: "/backups", retentionKeepLastN: 4 }, "desktop", isWindows);
		assert.equal(data.schemaVersion, 2);
		assert.equal(data.profiles.length, 1);
		const profile = data.profiles[0];
		assert.equal(profile.settings[isWindows ? "backupFolderPathWindows" : "backupFolderPathUnix"], "/backups");
		assert.equal(profile.settings.retentionKeepLastN, 4);
		assert.equal(data.activeProfileByDeviceName.desktop, profile.id);
	});
}

test("normalizes invalid numeric settings and exclusions without mutating defaults", () => {
	const data = normalizeLoadedData({
		compressionLevel: 100,
		startupDelayMs: -1,
		retentionKeepDays: NaN,
		excludedPaths: ["/attachments/", "attachments", "../outside", "notes\\private"],
	}, "desktop", false);
	assert.equal(data.profiles[0].settings.compressionLevel, 9);
	assert.equal(data.profiles[0].settings.startupDelayMs, 0);
	assert.equal(data.profiles[0].settings.retentionKeepDays, DEFAULT_SETTINGS.retentionKeepDays);
	assert.deepEqual(data.profiles[0].settings.excludedPaths, ["attachments", "notes/private"]);
	assert.deepEqual(DEFAULT_SETTINGS.excludedPaths, []);
});

test("creates a default profile when a saved profile list is empty", () => {
	const data = normalizeLoadedData({ profiles: [], activeProfileByDeviceName: { desktop: "missing" } }, "desktop", false);
	assert.equal(data.profiles.length, 1);
	assert.equal(data.activeProfileByDeviceName.desktop, data.profiles[0].id);
});

test("profile edits persist and deletion repairs every device selection", async () => {
	let saved;
	const manager = new ProfileManager(undefined, "desktop", async (data) => {
		saved = structuredClone(data);
	}, false);
	const original = manager.getActiveProfile();
	original.settings.excludedPaths.push("private");
	const copy = await manager.duplicateActiveProfile();
	assert.notEqual(copy.id, original.id);
	assert.equal(copy.name, "Default copy");
	copy.settings.excludedPaths.push("cache");
	assert.deepEqual(original.settings.excludedPaths, ["private"]);
	assert.equal(manager.getActiveProfile().id, copy.id);
	await manager.renameProfile(copy.id, " Travel ");
	assert.equal(saved.profiles[1].name, "Travel");
	manager.data.activeProfileByDeviceName.laptop = copy.id;
	assert.equal(await manager.deleteProfile(copy.id), true);
	assert.deepEqual(saved.activeProfileByDeviceName, { desktop: original.id, laptop: original.id });
	assert.equal(await manager.deleteProfile(original.id), false);
	assert.equal(await manager.deleteProfile("missing"), false);
});

test("profile creation has unique names and preserves another device's selection", async () => {
	const manager = new ProfileManager(undefined, "desktop", async () => {}, false);
	const original = manager.getActiveProfile();
	manager.data.activeProfileByDeviceName.laptop = original.id;
	const first = await manager.createProfile();
	const second = await manager.createProfile();
	assert.equal(first.name, "New profile");
	assert.equal(second.name, "New profile 2");
	assert.equal(manager.data.activeProfileByDeviceName.laptop, original.id);
	await manager.setActiveProfileForCurrentDevice("missing");
	assert.equal(manager.getActiveProfile().id, second.id);
	const reloaded = new ProfileManager(manager.data, "laptop", async () => {}, false);
	assert.equal(reloaded.getActiveProfile().id, original.id);
});
