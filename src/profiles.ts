import { Platform } from "obsidian";
import { DEFAULT_SETTINGS } from "./settings";
import type { BackupProfile, BackupSettings, VaultBackupSettings } from "./types";
import { normalizeExcludedPaths } from "./exclusions";

export type LoadedSettingsData = Partial<
	VaultBackupSettings & BackupSettings & { backupFolderPath?: string }
>;

export function normalizeLoadedData(
	loadedData: LoadedSettingsData | undefined,
	deviceName: string
): VaultBackupSettings {
	if (Array.isArray(loadedData?.profiles)) {
		const profiles = loadedData.profiles
			.map((profile, index) => normalizeProfile(profile, index))
			.filter((profile): profile is BackupProfile => Boolean(profile));

		if (profiles.length === 0) {
			profiles.push(createDefaultProfile());
		}

		const activeProfileByDeviceName =
			loadedData.activeProfileByDeviceName &&
			typeof loadedData.activeProfileByDeviceName === "object"
				? { ...loadedData.activeProfileByDeviceName }
				: {};

		if (
			!profiles.some(
				(profile) => profile.id === activeProfileByDeviceName[deviceName]
			)
		) {
			activeProfileByDeviceName[deviceName] = profiles[0]!.id;
		}

		return {
			schemaVersion: 2,
			profiles,
			activeProfileByDeviceName,
		};
	}

	const migratedSettings = normalizeSettings(loadedData ?? {});

	if (
		loadedData?.backupFolderPath &&
		!loadedData.backupFolderPathWindows &&
		!loadedData.backupFolderPathUnix
	) {
		if (Platform.isWin) {
			migratedSettings.backupFolderPathWindows = loadedData.backupFolderPath;
		} else {
			migratedSettings.backupFolderPathUnix = loadedData.backupFolderPath;
		}
	}

	const profile: BackupProfile = {
		id: generateProfileId(),
		name: "Default",
		settings: migratedSettings,
	};

	return {
		schemaVersion: 2,
		profiles: [profile],
		activeProfileByDeviceName: {
			[deviceName]: profile.id,
		},
	};
}

export function createProfile(
	profiles: BackupProfile[],
	name = "New profile"
): BackupProfile {
	return {
		id: generateProfileId(),
		name: getUniqueProfileName(profiles, name),
		settings: cloneSettings(DEFAULT_SETTINGS),
	};
}

export function duplicateProfile(
	profiles: BackupProfile[],
	profile: BackupProfile
): BackupProfile {
	return {
		id: generateProfileId(),
		name: getUniqueProfileName(profiles, `${profile.name} copy`),
		settings: cloneSettings(profile.settings),
	};
}

function normalizeProfile(
	profile: Partial<BackupProfile> | undefined,
	index: number
): BackupProfile | null {
	if (!profile || typeof profile !== "object") {
		return null;
	}

	return {
		id:
			typeof profile.id === "string" && profile.id.trim()
				? profile.id
				: generateProfileId(),
		name:
			typeof profile.name === "string" && profile.name.trim()
				? profile.name
				: `Profile ${index + 1}`,
		settings: normalizeSettings(profile.settings ?? {}),
	};
}

function normalizeSettings(settings: Partial<BackupSettings>): BackupSettings {
	const normalized = Object.assign(
		{},
		DEFAULT_SETTINGS,
		settings
	) as BackupSettings;

	normalized.excludedPaths = normalizeExcludedPaths(
		Array.isArray(normalized.excludedPaths) ? normalized.excludedPaths : []
	);
	normalized.compressionLevel = clampInteger(
		normalized.compressionLevel,
		0,
		9,
		DEFAULT_SETTINGS.compressionLevel
	);
	normalized.startupDelayMs = Math.max(
		0,
		toInteger(normalized.startupDelayMs, DEFAULT_SETTINGS.startupDelayMs)
	);
	normalized.retentionKeepLastN = Math.max(
		0,
		toInteger(
			normalized.retentionKeepLastN,
			DEFAULT_SETTINGS.retentionKeepLastN
		)
	);
	normalized.retentionKeepDays = Math.max(
		0,
		toInteger(normalized.retentionKeepDays, DEFAULT_SETTINGS.retentionKeepDays)
	);

	if (!["keepLastN", "keepDays", "and", "or"].includes(normalized.retentionMode)) {
		normalized.retentionMode = DEFAULT_SETTINGS.retentionMode;
	}

	return normalized;
}

function createDefaultProfile(): BackupProfile {
	return {
		id: generateProfileId(),
		name: "Default",
		settings: cloneSettings(DEFAULT_SETTINGS),
	};
}

function cloneSettings(settings: BackupSettings): BackupSettings {
	return {
		...settings,
		excludedPaths: [...settings.excludedPaths],
	};
}

function getUniqueProfileName(
	profiles: BackupProfile[],
	baseName: string
): string {
	const existingNames = new Set(profiles.map((profile) => profile.name));

	if (!existingNames.has(baseName)) {
		return baseName;
	}

	let index = 2;
	let candidate = `${baseName} ${index}`;
	while (existingNames.has(candidate)) {
		index++;
		candidate = `${baseName} ${index}`;
	}

	return candidate;
}

function generateProfileId(): string {
	return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampInteger(
	value: unknown,
	min: number,
	max: number,
	fallback: number
): number {
	return Math.min(max, Math.max(min, toInteger(value, fallback)));
}

function toInteger(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value)
		? Math.floor(value)
		: fallback;
}
