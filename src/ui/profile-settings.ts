import { Notice, Setting } from "obsidian";
import type { ProfileManager } from "../profile-manager";

export function renderProfileSettings(
	containerEl: HTMLElement,
	profiles: ProfileManager,
	refresh: () => void
): void {
	const activeProfile = profiles.getActiveProfile();

	new Setting(containerEl)
		.setName("Backup profiles")
		.setHeading();

	new Setting(containerEl)
		.setName("Profile for this device")
		.setDesc(`Current device: ${profiles.deviceName}. Changing this saves the selected profile for this device.`)
		.addDropdown((dropdown) => {
			for (const profile of profiles.data.profiles) {
				dropdown.addOption(profile.id, profile.name);
			}

			dropdown
				.setValue(activeProfile.id)
				.onChange(async (value) => {
					await profiles.setActiveProfileForCurrentDevice(value);
					refresh();
				});
		});

	new Setting(containerEl)
		.setName("Profile name")
		.setDesc("Rename the selected backup profile")
		.addText((text) =>
			text
				.setPlaceholder("Default")
				.setValue(activeProfile.name)
				.onChange(async (value) => {
					await profiles.renameProfile(activeProfile.id, value);
				})
		);

	new Setting(containerEl)
		.setName("Manage profiles")
		.setDesc("Create, duplicate, or delete backup profiles")
		.addButton((button) =>
			button
				.setButtonText("New")
				.onClick(async () => {
					await profiles.createProfile();
					refresh();
				})
		)
		.addButton((button) =>
			button
				.setButtonText("Duplicate")
				.onClick(async () => {
					await profiles.duplicateActiveProfile();
					refresh();
				})
		)
		.addButton((button) =>
			button
				.setButtonText("Delete")
				.setWarning()
				.onClick(async () => {
					const deleted = await profiles.deleteProfile(activeProfile.id);
					if (!deleted) {
						new Notice("At least one backup profile is required");
					}
					refresh();
				})
		);
}
