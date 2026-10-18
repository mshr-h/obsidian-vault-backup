import type { BackupProfile, BackupSettings, VaultBackupSettings } from "./types";
import {
	createProfile,
	duplicateProfile,
	normalizeLoadedData,
	type LoadedSettingsData,
} from "./profiles";

export class ProfileManager {
	readonly data: VaultBackupSettings;

	constructor(
		loadedData: LoadedSettingsData | undefined,
		readonly deviceName: string,
		private readonly saveData: (data: VaultBackupSettings) => Promise<void>,
		isWindows: boolean
	) {
		this.data = normalizeLoadedData(loadedData, deviceName, isWindows);
	}

	async save(): Promise<void> {
		await this.saveData(this.data);
	}

	getActiveProfile(): BackupProfile {
		const activeProfileId = this.data.activeProfileByDeviceName[this.deviceName];
		const activeProfile =
			this.data.profiles.find((profile) => profile.id === activeProfileId) ??
			this.data.profiles[0]!;

		if (this.data.activeProfileByDeviceName[this.deviceName] !== activeProfile.id) {
			this.data.activeProfileByDeviceName[this.deviceName] = activeProfile.id;
		}

		return activeProfile;
	}

	getActiveSettings(): BackupSettings {
		return this.getActiveProfile().settings;
	}

	async setActiveProfileForCurrentDevice(profileId: string): Promise<void> {
		if (!this.data.profiles.some((profile) => profile.id === profileId)) {
			return;
		}

		this.data.activeProfileByDeviceName[this.deviceName] = profileId;
		await this.save();
	}

	async createProfile(name = "New profile"): Promise<BackupProfile> {
		const profile = createProfile(this.data.profiles, name);
		this.data.profiles.push(profile);
		await this.setActiveProfileForCurrentDevice(profile.id);
		return profile;
	}

	async duplicateActiveProfile(): Promise<BackupProfile> {
		const activeProfile = this.getActiveProfile();
		const profile = duplicateProfile(this.data.profiles, activeProfile);
		this.data.profiles.push(profile);
		await this.setActiveProfileForCurrentDevice(profile.id);
		return profile;
	}

	async renameProfile(profileId: string, name: string): Promise<void> {
		const profile = this.data.profiles.find((item) => item.id === profileId);
		const trimmedName = name.trim();

		if (!profile || !trimmedName) {
			return;
		}

		profile.name = trimmedName;
		await this.save();
	}

	async deleteProfile(profileId: string): Promise<boolean> {
		if (this.data.profiles.length <= 1) {
			return false;
		}

		const profileIndex = this.data.profiles.findIndex(
			(profile) => profile.id === profileId
		);

		if (profileIndex === -1) {
			return false;
		}

		this.data.profiles.splice(profileIndex, 1);
		const fallbackProfile = this.data.profiles[0]!;

		for (const deviceName in this.data.activeProfileByDeviceName) {
			const activeProfileId = this.data.activeProfileByDeviceName[deviceName];
			if (activeProfileId === profileId) {
				this.data.activeProfileByDeviceName[deviceName] = fallbackProfile.id;
			}
		}

		await this.save();
		return true;
	}
}
