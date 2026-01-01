import { moment } from "obsidian";

/**
 * Sanitize a string for use in a filename
 */
function sanitizeFilename(str: string): string {
	// Replace characters that are invalid in filenames
	return str.replace(/[<>:"/\\|?*]/g, "_");
}

/**
 * Parse template and replace variables with actual values
 * Supports: {{vault}}, {{date}}, {{time}}, {{datetime}}, {{date:FORMAT}}, {{time:FORMAT}}, {{datetime:FORMAT}}
 */
export function parseTemplate(template: string, vaultName: string): string {
	let result = template;
	const now = moment();

	// Replace {{vault}}
	result = result.replace(/\{\{vault\}\}/g, sanitizeFilename(vaultName));

	// Replace {{datetime:FORMAT}} and {{datetime}}
	result = result.replace(/\{\{datetime:([^}]+)\}\}/g, (_, format) => {
		return now.format(format);
	});
	result = result.replace(/\{\{datetime\}\}/g, now.format("YYYY-MM-DD_HHmmss"));

	// Replace {{date:FORMAT}} and {{date}}
	result = result.replace(/\{\{date:([^}]+)\}\}/g, (_, format) => {
		return now.format(format);
	});
	result = result.replace(/\{\{date\}\}/g, now.format("YYYY-MM-DD"));

	// Replace {{time:FORMAT}} and {{time}}
	result = result.replace(/\{\{time:([^}]+)\}\}/g, (_, format) => {
		return now.format(format);
	});
	result = result.replace(/\{\{time\}\}/g, now.format("HHmmss"));

	return result;
}

/**
 * Convert template to regex pattern for matching backup files
 * This allows us to identify which files were created by this plugin
 */
export function templateToRegex(template: string): RegExp {
	// Escape special regex characters in the template
	let pattern = template.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

	// Replace template variables with wildcards
	// {{vault}} -> any valid filename characters
	pattern = pattern.replace(/\\\{\\\{vault\\\}\\\}/g, "[^<>:\"/\\\\|?*]+");

	// {{datetime:FORMAT}} -> wildcard (we don't parse FORMAT precisely)
	pattern = pattern.replace(/\\\{\\\{datetime:[^}]+\\\}\\\}/g, ".+?");
	pattern = pattern.replace(/\\\{\\\{datetime\\\}\\\}/g, ".+?");

	// {{date:FORMAT}} -> wildcard
	pattern = pattern.replace(/\\\{\\\{date:[^}]+\\\}\\\}/g, ".+?");
	pattern = pattern.replace(/\\\{\\\{date\\\}\\\}/g, ".+?");

	// {{time:FORMAT}} -> wildcard
	pattern = pattern.replace(/\\\{\\\{time:[^}]+\\\}\\\}/g, ".+?");
	pattern = pattern.replace(/\\\{\\\{time\\\}\\\}/g, ".+?");

	// Ensure it matches the full filename (with .zip extension)
	return new RegExp(`^${pattern}\\.zip$`);
}
