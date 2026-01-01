# Obsidian Vault Backup

A local backup plugin for Obsidian that creates ZIP archives of your entire vault with automatic retention management.

## Features

- **Manual & Automatic Backups**: Create backups on-demand, on startup, or on shutdown
- **Atomic ZIP Creation**: Uses temporary files with atomic rename to ensure backup integrity
- **Flexible File Naming**: Template-based filename generation with date/time variables
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

## Configuration

Access settings via **Settings → Plugin Options → Vault Backup**:

- **Backup folder path**: Local directory where ZIP files will be saved
- **Filename template**: Pattern for backup filenames (see variables above)
- **Compression level**: ZIP compression (0 = none, 9 = maximum)
- **Run on startup**: Automatically backup when Obsidian starts
- **Startup delay**: Milliseconds to wait before startup backup
- **Run on shutdown**: Best-effort backup when Obsidian closes
- **Retention mode**: How to apply retention rules
- **Keep last N backups**: Number of recent backups to preserve
- **Keep backups within days**: Age threshold for backups

## Installation

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

- Node.js v16 or higher
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Development mode (watch for changes)
npm run dev

# Production build
npm run build

# Lint code
npm run lint

# Bump version and release it to github
make release VERSION=0.1.0
```

### Project Structure

```
src/
  main.ts              # Plugin entry point and lifecycle
  settings.ts          # Settings interface and UI
  types.ts             # TypeScript type definitions
  backup.ts            # Backup execution and concurrency control
  zip.ts               # ZIP file creation with atomic operations
  template.ts          # Filename template parsing
  retention.ts         # Backup retention management
  ui/
    backup-list-modal.ts  # Backup list UI
```

## How It Works

### Atomic Backup Process

1. **Temporary file creation**: Creates `<filename>.tmp.<random>` in the backup folder
2. **ZIP generation**: Streams all vault files into the temporary archive
3. **Atomic rename**: Renames temp file to final `.zip` filename
4. **Retention cleanup**: Removes old backups according to retention policy

This approach ensures backups are never corrupted, even if the process is interrupted.

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
