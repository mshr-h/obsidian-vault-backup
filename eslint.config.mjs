import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig(
	globalIgnores(["node_modules/", "dist/", "main.js", "versions.json"]),
	...obsidianmd.configs.recommended,
	{
		files: ["src/**/*.ts"],
		languageOptions: {
			globals: globals.browser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		files: ["**/*.mjs"],
		languageOptions: { globals: globals.node },
	},
	{
		files: ["tests/**/*.mjs"],
		rules: {
			// Test fixtures deliberately exercise hidden vault configuration files.
			"obsidianmd/hardcoded-config-path": "off",
		},
	},
	{
		files: ["tests/support/obsidian.mjs"],
		rules: {
			// The host API is unavailable in Node; this stub supplies its Moment export.
			"@typescript-eslint/no-restricted-imports": "off",
		},
	},
	{
		files: ["package.json"],
		rules: {
			// Tests must use the same Moment implementation that Obsidian exposes.
			"depend/ban-dependencies": ["error", {
				presets: ["native", "microutilities", "preferred"],
				allowed: ["moment"],
			}],
		},
	},
	{
		files: ["src/ui/**/*.ts"],
		// Keep the settings UI compatible with Obsidian versions before 1.13.
		rules: {
			"obsidianmd/settings-tab/prefer-setting-definitions": "off",
			"@typescript-eslint/no-deprecated": ["error", {
				allow: [{ from: "package", package: "obsidian", name: [
					"setWarning", "setDynamicTooltip",
				] }],
			}],
		},
	},
);
