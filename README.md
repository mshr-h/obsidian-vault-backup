# Obsidian Vault Backup

A local backup plugin for Obsidian that creates ZIP archives of your entire vault with automatic retention management.

## Features

- **Manual & Automatic Backups**: Create backups on-demand, on startup, or on shutdown
- **Backup Profiles**: Save multiple backup configurations and choose a profile per device
- **Atomic ZIP Creation**: Uses temporary files with atomic rename to ensure backup integrity
- **Flexible File Naming**: Template-based filename generation with date/time variables
- **Configurable Exclusions**: Skip selected vault-relative files and folders
- **Retention Management**: Automatically manage old backups with configurable policies
- **Hidden Files Support**: Includes all files in your vault, including dotfiles
- **Desktop Only**: Optimized for desktop environments (macOS, Windows, Linux)

### Commands

- **Create backup now**: Manually trigger a backup (also available via ribbon icon)
- **Show backup list**: View all existing backups matching your filename template

### Filename Template Variables

Use the following variables in your filename template:

- `{{vault}}`: Vault name (sanitized for filesystem)
- `{{date}}`: Current date (default: YYYY-MM-DD)
- `{{date:FORMAT}}`: Custom date format
- `{{time}}`: Current time (default: HHmmss)
- `{{time:FORMAT}}`: Custom time format
- `{{datetime}}`: Date and time (default: YYYY-MM-DD_HHmmss)
- `{{datetime:FORMAT}}`: Custom datetime format

Example: `{{vault}}_{{datetime:YYYY-MM-DD_HHmmss}}` → `MyVault_2026-01-01_203015.zip`

### Retention Policy Modes

Configure how old backups are managed:

- **Keep last N backups only**: Retain only the most recent N backups
- **Keep backups within days only**: Keep backups created within the specified number of days
- **Keep if both conditions met (AND)**: Backup must satisfy both conditions
- **Keep if either condition met (OR)**: Backup satisfies at least one condition

Set either value to 0 for unlimited retention in that dimension.

### Backup Profiles

Backup profiles let you save multiple complete backup configurations. Each profile includes the backup folder paths, filename template, compression level, excluded paths, automatic backup settings, and retention policy.

The selected profile is saved per device using the device name, so a synced vault can use different backup settings on each desktop.

## Configuration

Access settings via **Settings → Plugin Options → Vault Backup**:

- **Backup profiles**: Create, duplicate, rename, delete, and select the backup profile used on the current device
- **Backup folder path**: Local directory where ZIP files will be saved
- **Filename template**: Pattern for backup filenames (see variables above)
- **Compression level**: ZIP compression (0 = none, 9 = maximum)
- **Excluded paths**: Vault-relative files or folders to skip, one path per line
- **Run on startup**: Automatically backup when Obsidian starts
- **Startup delay**: Milliseconds to wait before startup backup
- **Run on shutdown**: Best-effort backup when Obsidian closes
- **Retention mode**: How to apply retention rules
- **Keep last N backups**: Number of recent backups to preserve
- **Keep backups within days**: Age threshold for backups

## Installation

Requires Obsidian Desktop 1.4.5 or newer and an installer containing Node.js 18 or newer (Electron 25+). [Obsidian 1.4.5 updated the installer to Electron 25](https://obsidian.md/changelog/2023-08-31-desktop-v1.4.5/). If the app was updated using an older installer, download and reinstall Obsidian to update the embedded runtime. Version 0.3.0 raises this requirement for Archiver 8.

### Manual Installation

1. Download the latest release files (`main.js`, `manifest.json`, `styles.css`)
2. Create a folder: `<vault>/.obsidian/plugins/vault-backup/`
3. Copy the downloaded files into this folder
4. Reload Obsidian
5. Enable "Vault Backup" in Settings → Community plugins

### From Source

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to compile
4. Copy `main.js`, `manifest.json`, and `styles.css` to your vault's plugin folder
5. Reload Obsidian and enable the plugin

## Development

### Prerequisites

- Node.js 22.13+ in the 22.x series, or Node.js 24+ (Node.js 24 LTS recommended)
- npm

### Setup

```bash
# Install dependencies
npm ci

# Development mode (watch for changes)
npm run dev

# Production build
npm run build

# Lint code
npm run lint

# Run regression tests
npm test

# Lint, test, type-check, and build
npm run check

# Bump version and release it to github
make release VERSION=0.1.0
```

### Project Structure

```
src/
  main.ts                 # Plugin lifecycle and Obsidian integration
  commands.ts             # Stable command and ribbon registrations
  settings.ts             # Default settings
  types.ts                # Shared data types
  profiles.ts             # Profile normalization and legacy migration
  profile-manager.ts      # Profile selection, editing, and persistence
  platform.ts             # Platform-specific backup paths
  backup.ts               # Backup execution and concurrency control
  zip.ts                  # Streaming ZIP creation and failure cleanup
  exclusions.ts           # Vault-relative exclusion matching
  template.ts             # Filename template parsing
  retention.ts            # Backup retention management
  ui/
    settings-tab.ts       # Backup configuration UI
    profile-settings.ts   # Profile configuration UI
    backup-list-modal.ts  # Backup list UI
scripts/test.mjs           # Bundle tests and run the Node.js test runner
tests/                     # Profile, ZIP, backup, and retention regressions
```

Tests use temporary fixture directories, an Obsidian API stub, and an independent ZIP reader. They do not read or modify your vault. CI runs `npm run check` on Node.js 22 and 24; release builds use `npm ci` with the same checks.

Obsidian and the test tools are development dependencies; Archiver is bundled into `main.js`. TypeScript stays on 6.0 because [typescript-eslint's supported range](https://typescript-eslint.io/users/dependency-versions/) excludes 7.x. `@types/node` tracks the minimum plugin runtime (18), while the development tools use Node.js 22 or 24+. The lint plugin's nested Moment dependency is overridden to the patched version used by the tests. The settings UI retains APIs supported before Obsidian 1.13.

## How It Works

### Atomic Backup Process

1. **Temporary file creation**: Creates `<filename>.tmp.<random>` in the backup folder
2. **ZIP generation**: Streams vault files into the temporary archive, skipping excluded paths
3. **Atomic rename**: Renames temp file to final `.zip` filename
4. **Retention cleanup**: Removes old backups according to retention policy

The final ZIP is published only after the archive and output stream complete. A failed or interrupted run can leave a temporary file, but does not replace an existing final backup with a partial archive. Read failures abort the backup instead of silently omitting files.

### Excluded Paths

Excluded paths are matched relative to the vault root. Enter one file or folder per line in settings. For example, `private.md` excludes only that file, while `attachments` excludes the folder and everything inside it. Leading slashes, trailing slashes, and Windows backslashes are normalized automatically. Glob patterns and regular expressions are not supported.

When the backup folder is inside the vault, that folder is excluded automatically to avoid recursively archiving previous backups. When saving directly at the vault root, only the current temporary file and target ZIP are automatically excluded; use a dedicated backup folder to keep older archives out of future backups.

### Concurrency Control

Only one backup can run at a time. If a backup is already in progress, additional requests are rejected with a notice.

### Startup/Shutdown Behavior

- **Startup backup**: Runs after a configurable delay to avoid interfering with vault loading
- **Shutdown backup**: Best-effort only; may not complete if Obsidian is force-quit or crashes

## Privacy & Security

- **100% Local**: All backups are stored locally; no data is sent to external services
- **No Telemetry**: No analytics or tracking
- **Desktop Only**: Requires filesystem access (not compatible with mobile)

## Troubleshooting

### Backup fails with "input source must be valid"

Ensure the vault path exists and is accessible. Check the developer console (Cmd+Opt+I / Ctrl+Shift+I) for detailed error messages.

### Temp files left in backup folder

If temp files (`.tmp.*`) remain after a failed backup, they can be safely deleted manually.

### Old backups not being deleted

Verify your retention settings and ensure the filename template matches existing backup files.

## License

This plugin is licensed under the 0-BSD License.

## Support

If you find this plugin useful, consider supporting its development.
