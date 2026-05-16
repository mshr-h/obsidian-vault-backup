/**
 * Normalize a user-entered vault-relative path for exclusion matching.
 * Returns null for empty paths or paths that try to traverse directories.
 */
export function normalizeExcludedPath(input: string): string | null {
	const trimmed = input.trim();
	if (!trimmed) {
		return null;
	}

	const normalizedSeparators = trimmed.replace(/\\/g, "/");
	const withoutOuterSlashes = normalizedSeparators
		.replace(/^\/+/, "")
		.replace(/\/+$/, "");
	const segments = withoutOuterSlashes
		.split("/")
		.filter((segment) => segment.length > 0);

	if (
		segments.length === 0 ||
		segments.some((segment) => segment === "." || segment === "..")
	) {
		return null;
	}

	return segments.join("/");
}

export function normalizeExcludedPaths(inputs: string[]): string[] {
	const normalizedPaths = new Set<string>();

	for (const input of inputs) {
		const normalizedPath = normalizeExcludedPath(input);
		if (normalizedPath) {
			normalizedPaths.add(normalizedPath);
		}
	}

	return Array.from(normalizedPaths);
}

export function isPathExcluded(relativePath: string, excludedPaths: string[]): boolean {
	const normalizedPath = normalizeExcludedPath(relativePath);
	if (!normalizedPath) {
		return false;
	}

	return excludedPaths.some(
		(excludedPath) =>
			normalizedPath === excludedPath ||
			normalizedPath.startsWith(`${excludedPath}/`)
	);
}
