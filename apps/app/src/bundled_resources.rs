//! Launcher resources embedded into the executable for the single-file build.
//!
//! `build.rs` embeds every file under `apps/app/resources` into the binary and
//! writes a lookup table (`$OUT_DIR/bundled_resources_table.rs`). A release keeps
//! shipping `resources\` next to the executable (NSIS installer), but the
//! portable build is a single `.exe`, so on first launch the embedded payload is
//! released to `%APPDATA%\<identifier>\resources\<version>\`.
//!
//! Resolution order (the single place every caller should go through):
//!   1. `<exe directory>\resources` — installer and legacy portable layout.
//!   2. `%APPDATA%\<identifier>\resources\<version>` — released embedded payload.
//!
//! The release is staged in a temporary directory and published with an atomic
//! rename, so an interrupted extraction never leaves a half-written tree. A
//! marker file stores the version, which makes subsequent launches a no-op.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use std::time::{SystemTime, UNIX_EPOCH};

include!(concat!(env!("OUT_DIR"), "/bundled_resources_table.rs"));

/// Marker written inside a released directory once every file exists.
const MARKER_FILE: &str = ".release-complete";
/// Directory that holds `blockbench-skin/` and `seed-map/`.
const RESOURCES_DIR_NAME: &str = "resources";
/// Subdirectory served by the `mcl-skin` protocol.
pub const BLOCKBENCH_SKIN_DIR: &str = "blockbench-skin";
/// Subdirectory holding the native seed map engine.
pub const SEED_MAP_DIR: &str = "seed-map";

static RESOLVED: OnceLock<PathBuf> = OnceLock::new();

/// Version used in the released directory name, so an update extracts a fresh
/// copy instead of reusing files from the previous build.
pub fn resources_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

/// FNV-1a fingerprint over every embedded `(path, bytes)` pair, provided by
/// `build.rs`. The version alone cannot catch a payload change that keeps the
/// same version (brand copy fixes, asset tweaks), so the marker stores both and
/// a stale release is replaced even when `resources_version()` matches.
pub fn resources_fingerprint() -> &'static str {
    env!("MCL_RESOURCE_FINGERPRINT")
}

/// Exact contents written to `.release-complete`; also the reuse check.
fn release_marker() -> String {
    format!("{} {}\n", resources_version(), resources_fingerprint())
}

/// Resolve the directory that contains `blockbench-skin/` and `seed-map/`.
///
/// The first successful resolution is cached for the process lifetime.
pub fn resolve_resources_dir() -> io::Result<PathBuf> {
    if let Some(cached) = RESOLVED.get() {
        return Ok(cached.clone());
    }

    let executable = std::env::current_exe()?;
    let executable_dir = executable.parent().ok_or_else(|| {
        io::Error::other("Cannot locate the launcher executable directory")
    })?;
    let adjacent = executable_dir.join(RESOURCES_DIR_NAME);
    let resolved = if adjacent
        .join(BLOCKBENCH_SKIN_DIR)
        .join("index.html")
        .is_file()
    {
        tracing::info!(
            path = %adjacent.display(),
            "Launcher resources: using the directory shipped next to the executable"
        );
        adjacent
    } else {
        release_embedded()?
    };

    let _ = RESOLVED.set(resolved.clone());
    Ok(resolved)
}

/// Resolve the resources once during startup so extraction happens before the
/// window appears and any problem is logged with its cause.
pub fn warm_up() {
    match resolve_resources_dir() {
        Ok(path) => tracing::info!(
            path = %path.display(),
            version = resources_version(),
            "Launcher resources are ready"
        ),
        Err(error) => tracing::warn!(
            %error,
            "Launcher resources are unavailable; the skin editor and seed map will not work"
        ),
    }
}

/// `%APPDATA%\<identifier>` (or the platform equivalent), matching the data
/// directory the launcher itself uses.
fn app_data_root() -> io::Result<PathBuf> {
    let base = dirs::data_dir().ok_or_else(|| {
        io::Error::other("Cannot locate the user data directory")
    })?;
    Ok(base.join(theseus::brand::app_data_dir_identifier(
        theseus::brand::BUNDLE_IDENTIFIER,
    )))
}

/// Release the embedded payload unless the versioned directory is complete.
fn release_embedded() -> io::Result<PathBuf> {
    let root = app_data_root()?.join(RESOURCES_DIR_NAME);
    let version_dir = root.join(resources_version());

    if is_complete(&version_dir) {
        tracing::info!(
            path = %version_dir.display(),
            version = resources_version(),
            fingerprint = resources_fingerprint(),
            "Launcher resources: reusing the previously released embedded payload"
        );
        return Ok(version_dir);
    }

    fs::create_dir_all(&root)?;
    let temp = root.join(format!(
        ".release-{}-{}",
        std::process::id(),
        unique_suffix()
    ));
    if temp.exists() {
        fs::remove_dir_all(&temp)?;
    }

    let staged = (|| -> io::Result<()> {
        for (relative, contents) in BUNDLED_RESOURCES {
            let target = temp.join(Path::new(relative));
            if let Some(parent) = target.parent() {
                fs::create_dir_all(parent)?;
            }
            fs::write(&target, contents)?;
        }
        fs::write(temp.join(MARKER_FILE), release_marker())?;
        Ok(())
    })();
    if let Err(error) = staged {
        let _ = fs::remove_dir_all(&temp);
        return Err(error);
    }

    // Publish atomically. A previous incomplete copy is moved aside first so a
    // stale tree can never be mistaken for a complete release.
    if version_dir.exists() {
        let superseded = root.join(format!(
            ".stale-{}-{}",
            std::process::id(),
            unique_suffix()
        ));
        fs::rename(&version_dir, &superseded)?;
        if let Err(error) = fs::rename(&temp, &version_dir) {
            let _ = fs::rename(&superseded, &version_dir);
            let _ = fs::remove_dir_all(&temp);
            return Err(error);
        }
        let _ = fs::remove_dir_all(&superseded);
    } else {
        fs::rename(&temp, &version_dir)?;
    }

    tracing::info!(
        path = %version_dir.display(),
        files = BUNDLED_RESOURCES.len(),
        bytes = bundled_bytes(),
        version = resources_version(),
        fingerprint = resources_fingerprint(),
        "Launcher resources: released the embedded payload"
    );
    Ok(version_dir)
}

fn is_complete(directory: &Path) -> bool {
    let marker = directory.join(MARKER_FILE);
    marker.is_file()
        && fs::read_to_string(&marker)
            .map(|value| value.trim() == release_marker().trim())
            .unwrap_or(false)
}

fn unique_suffix() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default()
}

fn bundled_bytes() -> usize {
    BUNDLED_RESOURCES
        .iter()
        .map(|(_, contents)| contents.len())
        .sum()
}
